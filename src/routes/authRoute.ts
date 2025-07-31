import { Router, RequestHandler } from "express";
import {
  userSignup,
  userLogin,
  protect,
  getMe,
} from "../controllers/authController";

const router = Router();

// auth Routes
router.post("/signup", userSignup as RequestHandler);
router.post("/login", userLogin as RequestHandler);
router.get("/me", protect, getMe as RequestHandler);

export default router;
