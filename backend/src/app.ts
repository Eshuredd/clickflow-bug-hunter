import express from "express";
import cors from "cors";
import analysisRoutes from "./routes/analysis";

const app = express();

// ✅ enable CORS before your routes
app.use(
  cors({
    origin: "http://localhost:8080", // allow frontend origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // set to true if you use cookies/auth
  })
);

app.use(express.json());

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
