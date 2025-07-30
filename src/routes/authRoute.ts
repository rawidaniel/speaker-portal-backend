import { Router, RequestHandler } from "express";
import { userSignup, userLogin } from "../controllers/authController";

const router = Router();

// auth Routes
router.post("/signup", userSignup as RequestHandler);
router.post("/login", userLogin as RequestHandler);

export default router;
