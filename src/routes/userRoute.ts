import { Router, RequestHandler } from "express";
import { protect } from "../controllers/authController";
import { updateProfile, uploadUserPhoto } from "../controllers/userController";

const router = Router();

// User Routes
router.patch(
  "/profile",
  protect,
  uploadUserPhoto,
  updateProfile as RequestHandler
);

export default router;
