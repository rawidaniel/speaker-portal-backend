import express from "express";

import cors from "cors";

const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(express.json());

export default app;
