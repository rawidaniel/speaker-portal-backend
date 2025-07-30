import express from "express";
import authRoutes from "./routes/authRoute";
import globalErrorHandler from "./controllers/errorController";
import cors from "cors";

const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(express.json());

// Register routes
app.use("/api/auth", authRoutes);

// Global error handler
app.use(globalErrorHandler);

export default app;
