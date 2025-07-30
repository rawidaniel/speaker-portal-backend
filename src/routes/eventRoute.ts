import { Router, RequestHandler } from "express";
import {
  createEvent,
  confirmEvent,
  getEvents,
  getEventSpeakerResponse,
} from "../controllers/eventController";
import { protect } from "../controllers/authController";

const router = Router();

// auth Routes
router.post("/", protect, createEvent as RequestHandler);
router.post("/:id/confirm", protect, confirmEvent as RequestHandler);
router.get("/", protect, getEvents as RequestHandler);
router.get("/:id", protect, getEventSpeakerResponse as RequestHandler);

export default router;
