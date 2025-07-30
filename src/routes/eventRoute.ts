import { Router, RequestHandler } from "express";
import { createEvent } from "../controllers/eventController";
import { protect } from "../controllers/authController";

const router = Router();

// auth Routes
router.post("/", protect, createEvent as RequestHandler);

export default router;
