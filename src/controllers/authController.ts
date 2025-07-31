import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { promisify } from "util";
import Joi from "joi";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import * as ms from "ms";
import { removeSensitiveFields } from "../utils/sanitize";

const prisma = new PrismaClient();

// Environment Variables
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "1d") as ms.StringValue;
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ||
  "7d") as ms.StringValue;

// Generate Access Token
const generateAccessToken = (payload: object) => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
};

// ========== USER SIGNUP ==========
export const userSignup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Joi schema for signup
    const signupSchema = Joi.object({
      name: Joi.string().min(3).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    });

    // Validate before destructuring
    const { error, value } = signupSchema.validate(req.body);

    if (error) {
      // Remove all quotes and backslashes from Joi error message
      const rawMsg = error.details[0].message;
      const cleanMsg = rawMsg.replace(/['"\\]/g, "");
      return next(new AppError(cleanMsg, 400));
    }

    const { name, email, password } = value;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return next(new AppError("Email already exists", 400));

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const accessToken = generateAccessToken({ id: user.id });
    const sanitizedUser = removeSensitiveFields(user);
    res.status(201).json({ accessToken, user: sanitizedUser });
  }
);

// ========== USER LOGIN ==========
export const userLogin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const signupSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    });

    // Validate before destructuring
    const { error, value } = signupSchema.validate(req.body);

    if (error) {
      // Remove all quotes and backslashes from Joi error message
      const rawMsg = error.details[0].message;
      const cleanMsg = rawMsg.replace(/['"\\]/g, "");
      return next(new AppError(cleanMsg, 400));
    }
    const { email, password } = value;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return next(new AppError("Invalid email or password", 400));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new AppError("Invalid email or password", 400));

    const accessToken = generateAccessToken({ id: user.id });
    const sanitizedUser = removeSensitiveFields(user);
    res.status(200).json({ accessToken, user: sanitizedUser });
  }
);

// ========== PROTECT MIDDLEWARE ==========
export const protect = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("You are not logged in. Please log in to get access.", 403)
      );
    }

    const decoded = await verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist.",
          403
        )
      );
    }

    req.user = user;
    next();
  }
);

const verifyToken = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

// ========== GET USER INFORMATION ==========
export const getMe = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return next(new AppError("User don't exist", 400));

    res.status(200).json(user);
  }
);
