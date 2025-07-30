import { PrismaClient } from "@prisma/client";
import { NextFunction, Response } from "express";
import Joi from "joi";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import axios from "axios";
import qs from "qs";

const prisma = new PrismaClient();

// ========== CREATE EVENT ==========
export const createEvent = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const eventCreateSchema = Joi.object({
      title: Joi.string().min(5).required(),
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
