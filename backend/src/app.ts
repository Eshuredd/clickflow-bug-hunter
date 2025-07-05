import express from "express";
import cors from "cors";
import analysisRoutes from "./routes/analysis";
import { setupSwagger } from "./config/swagger";

const app = express();

// ✅ enable CORS before your routes
app.use(
  cors({
    origin: [
      "http://localhost:8080", // local development
      "https://www.getaigis.com", // production frontend domain
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // set to true if you use cookies/auth
  })
);

app.use(express.json());

// ✅ Setup Swagger documentation
setupSwagger(app);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the server is running
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Root endpoint
 *     description: Welcome message and API information
 *     tags:
 *       - General
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ClickFlow Bug Hunter API is running!"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 docs:
 *                   type: string
 *                   example: "/api-docs"
 */
app.get("/", (req, res) => {
  res.json({
    message: "ClickFlow Bug Hunter API is running!",
    version: "1.0.0",
    docs: "/api-docs",
    health: "/health",
  });
});

// ✅ your routes
app.use("/api/analysis", analysisRoutes);

// ✅ error logging middleware: catches and logs errors with stack traces
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("❗ Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

export default app;
