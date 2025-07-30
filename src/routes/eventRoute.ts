import { Router, RequestHandler } from "express";
import { createEvent, confirmEvent } from "../controllers/eventController";
import { protect } from "../controllers/authController";

const router = Router();

// auth Routes
router.post("/", protect, createEvent as RequestHandler);
router.post("/:id/confirm", protect, confirmEvent as RequestHandler);

export default router;
