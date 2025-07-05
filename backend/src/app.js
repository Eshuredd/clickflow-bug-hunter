"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const analysis_1 = __importDefault(require("./routes/analysis"));
const swagger_1 = require("./config/swagger");
const app = (0, express_1.default)();
// ✅ enable CORS before your routes
app.use((0, cors_1.default)({
    origin: "http://localhost:8080", // allow frontend origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // set to true if you use cookies/auth
}));
app.use(express_1.default.json());
// ✅ Setup Swagger documentation
(0, swagger_1.setupSwagger)(app);
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
app.use("/api/analysis", analysis_1.default);
// ✅ error logging middleware: catches and logs errors with stack traces
app.use((err, req, res, next) => {
    console.error("❗ Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});
exports.default = app;
