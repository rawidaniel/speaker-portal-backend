import { PrismaClient } from "@prisma/client";
import { NextFunction, Response } from "express";
import Joi from "joi";
import multer from "multer";
import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { removeSensitiveFields } from "../utils/sanitize";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const profileImageDir = path.join(__dirname, "../../public/images/profile");
if (!fs.existsSync(profileImageDir)) {
  fs.mkdirSync(profileImageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profileImageDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files (png, jpg, jpeg, gif)
    if (
      file.mimetype.startsWith("image/") ||
      (file.originalname &&
        [".png", ".jpg", ".jpeg", ".gif"].some((ext) =>
          file.originalname.toLowerCase().endsWith(ext)
        ))
    ) {
      cb(null, true);
    } else {
      cb(
        new AppError("Only image files (png, jpg, jpeg, gif) are allowed", 400)
      );
    }
  },
});

// ========== UPDATE  USER PROFILE ==========
export const updateProfile = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    console.log({ b: req.body });
    const userSchema = Joi.object({
      name: Joi.string().min(3).optional(),
      bio: Joi.string().optional(),
      photoUrl: Joi.string().optional(),
      contactInfo: Joi.string().optional(),
    });

    // Validate before destructuring
    const { error, value } = userSchema.validate(req.body);

    if (error) {
      // Remove all quotes and backslashes from Joi error message
      const rawMsg = error.details[0].message;
      const cleanMsg = rawMsg.replace(/['"\\]/g, "");
      return next(new AppError(cleanMsg, 400));
    }
    const { name, bio, photoUrl, contactInfo } = value;
    const user = req.user;
    console.log({ name, bio, photoUrl, contactInfo });
    // If a file was uploaded, set photoUrl to the file path
    if (req.file) {
      // Store the relative path for public access
      value.photoUrl = `/public/images/profile/${req.file.filename}`;
    }
    const updateUser = await prisma.user.update({
      where: { id: user.id },
      data: value,
    });

    const sanitizedUser = removeSensitiveFields(updateUser);
    res.status(200).json(sanitizedUser);
  }
);

export const uploadUserPhoto = upload.single("image");
