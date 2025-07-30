import express from "express";
import path from "path";
import authRoutes from "./routes/authRoute";
import userRoutes from "./routes/userRoute";

import globalErrorHandler from "./controllers/errorController";
import cors from "cors";

const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(express.json());

// Serve public directory statically
app.use("/public", express.static(path.join(__dirname, "../public")));
// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// Global error handler
app.use(globalErrorHandler);

export default app;
