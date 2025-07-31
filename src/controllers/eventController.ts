import { PrismaClient, RSVPStatus } from "@prisma/client";
import e, { NextFunction, Response } from "express";
import Joi from "joi";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import axios from "axios";
import qs from "qs";
import { paginator } from "../utils/paginator";
import { CronJob } from "cron";
import nodemailer from "nodemailer";
import type { Options as SMTPTransportOptions } from "nodemailer/lib/smtp-transport";

const prisma = new PrismaClient();

// ========== CREATE EVENT ==========
export const createEvent = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const eventCreateSchema = Joi.object({
      title: Joi.string().required(),
      description: Joi.string().required(),
      dateTime: Joi.date().iso().required(),
      duration: Joi.number().integer().min(1).required(),
    });

    // Validate before destructuring
    const { error, value } = eventCreateSchema.validate(req.body);

    if (error) {
      // Remove all quotes and backslashes from Joi error message
      const rawMsg = error.details[0].message;
      const cleanMsg = rawMsg.replace(/['"\\]/g, "");
      return next(new AppError(cleanMsg, 400));
    }
    const zoomMeeting = await createZoomMeeting(
      value.title,
      value.dateTime,
      value.duration
    );

    const newEvent = await prisma.event.create({
      data: {
        ...value,
        zoomLink: zoomMeeting.join_url,
        creator: {
          connect: { id: req.user.id }, // Connect the event to the user
        },
      },
    });

    res.status(200).json(newEvent);
  }
);

async function getZoomAccessToken() {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;

  const response = await axios.post(
    `https://zoom.us/oauth/token`,
    qs.stringify({ grant_type: "account_credentials", account_id: accountId }),
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
}

async function createZoomMeeting(
  topic: string,
  dateTime: string,
  duration: number
) {
  const token = await getZoomAccessToken();

  const response = await axios.post(
    `https://api.zoom.us/v2/users/me/meetings`,
    {
      topic: topic,
      type: 2, // Scheduled Meeting
      start_time: dateTime, // ISO string: '2025-08-01T10:00:00Z'
      duration, // in minutes
      timezone: "UTC",
      settings: {
        join_before_host: false,
        approval_type: 1,
        registration_type: 1,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data; // contains join_url, start_url, etc.
}

// ========== CONFIRM EVENT ==========
export const confirmEvent = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const revpSchema = Joi.object({
      status: Joi.string().valid("YES", "NO", "MAYBE").required(),
    });

    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const { error, value } = revpSchema.validate(req.body);

    if (error) {
      // Remove all quotes and backslashes from Joi error message
      const rawMsg = error.details[0].message;
      const cleanMsg = rawMsg.replace(/['"\\]/g, "");
      return next(new AppError(cleanMsg, 400));
    }

    const eventAlreadyConfirmed = await prisma.rSVP.findUnique({
      where: {
        userId_eventId: {
          userId: req.user.id,
          eventId: event.id,
        },
      },
    });

    if (eventAlreadyConfirmed) {
      return next(new AppError("You have already confirmed this event", 400));
    }

    const confirmEvent = await prisma.rSVP.create({
      data: {
        status: value.status as RSVPStatus,
        user: {
          connect: { id: req.user.id }, // Connect the RSVP to the user
        },
        event: {
          connect: { id: eventId }, // Connect the RSVP to the event
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            dateTime: true,
            zoomLink: true,
          },
        },
      },
    });

    res.status(200).json(confirmEvent);
  }
);

// ========== GET ALL EVENT ==========
export const getEvents = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const request = {
      page: req.query.page ? Number(req.query.page) : 1,
      itemsPerPage: req.query.itemsPerPage
        ? Number(req.query.itemsPerPage)
        : 10,
    };

    const paginate = paginator({
      itemsPerPage: request.itemsPerPage,
      page: request.page,
    });

    const events = await paginate(
      prisma.event,
      { page: request.page },
      {
        where: {
          creatorId: req.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      }
    );

    res.status(200).json(events);
  }
);

// ========== GET EVENT SPEAKER RESPONSE ==========
export const getEventSpeakerResponse = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const eventId = req.params.id;

    const request = {
      page: req.query.page ? Number(req.query.page) : 1,
      itemsPerPage: req.query.itemsPerPage
        ? Number(req.query.itemsPerPage)
        : 10,
    };

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const paginate = paginator({
      itemsPerPage: request.itemsPerPage,
      page: request.page,
    });

    const events = await paginate(
      prisma.rSVP,
      { page: request.page },
      {
        where: {
          eventId: req.params.id,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }
    );

    res.status(200).json(events);
  }
);

const sendEmailJob = CronJob.from({
  cronTime: "*/1 * * * *",
  onTick: async function () {
    const events = await prisma.event.findMany({
      where: {
        dateTime: {
          gte: new Date(), // Get events that are scheduled in the future
        },
      },
      orderBy: {
        dateTime: "asc", // Order by dateTime ascending
      },
      include: {
        rsvps: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });
    if (events.length === 0) {
      console.log("No upcoming events found.");
      return;
    }
    // loop through each event and send an email
    for (const event of events) {
      console.log(event.rsvps);
      if (event.rsvps.length === 0) {
        continue; // Skip sending email if no RSVPs
      }
      const subject = `Upcoming Event: ${event.title}`;
      const message = `Hello,\n\nYou have an upcoming event scheduled:\n\nTitle: ${event.title}\nDate and Time: ${new Date(event.dateTime).toLocaleString()}\nDuration: ${event.duration} minutes\nZoom Link: ${event.zoomLink}\n\nPlease make sure to join the meeting on time.\n\nBest regards,\nYour Event Team`;
      // Send email to all users who have RSVP'd to the event
      for (const rsvp of event.rsvps) {
        const to = rsvp.user.email;
        await sendEmail(to, subject, message);
      }
    }
    // console.log("You will see this message every second");
  },
  start: true,
  timeZone: "UTC",
});

sendEmailJob.start();

// Function to send email via SMTP
const sendEmail = async (to: String, subject: string, message: string) => {
  try {
    // Create a transporter (connection to the email server)
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.PASSWORD,
      },
    } as SMTPTransportOptions);

    // Define the email content
    const mailOptions = {
      from: process.env.FROM,
      to: to,
      subject: subject,
      text: message,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions as any);
    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
