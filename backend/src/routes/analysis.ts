import express, { Request, Response } from "express";
import { analyzeButtonClicks } from "../services/bugDetectionService";

const router = express.Router();

/**
 * @swagger
 * /api/analysis/analyze:
 *   post:
 *     summary: Analyze a website for bugs and issues
 *     description: Performs comprehensive analysis of a website to detect potential bugs and issues
 *     tags:
 *       - Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalysisRequest'
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisResult'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/analyze", async (req: any, res: any) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Placeholder for your analysis logic
    // Replace this with your actual bug detection service
    const analysisResult = {
      url,
      status: "success",
      data: {
        message: "Analysis completed successfully",
        issues: [],
        performance: {},
        accessibility: {},
      },
      timestamp: new Date().toISOString(),
    };

    res.json(analysisResult);
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/analysis/status:
 *   get:
 *     summary: Get analysis service status
 *     description: Check if the analysis service is running and available
 *     tags:
 *       - Analysis
 *     responses:
 *       200:
 *         description: Analysis service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                   example: "analysis"
 *                 status:
 *                   type: string
 *                   example: "running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/status", (req: any, res: any) => {
  res.json({
    service: "analysis",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// SSE endpoint for button click analysis
router.get("/button-clicks/stream", async (req: any, res: any) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    // Modified analyzeButtonClicks to accept a callback for streaming progress
    const results: any[] = [];
    await analyzeButtonClicks(url, (currentButton: any) => {
      res.write(`data: ${JSON.stringify({ currentButton })}\n\n`);
    }).then((finalResults: any[]) => {
      // Only send bugs with bugType and user-friendly textContent
      const bugs = finalResults
        .filter((r) => r.bugType && r.textContent)
        .map((r) => ({
          ...r,
          label: r.textContent || r.selector,
        }));
      res.write(`data: ${JSON.stringify({ done: true, bugs })}\n\n`);
      res.end();
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    res.end();
  }
});

// Existing POST endpoint (unchanged)
router.post("/button-clicks", async (req: any, res: any) => {
  const { url } = req.body;
  console.log(`Starting analysis for URL: ${url}`);
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    console.log(`Starting analysis for URL: ${url}`);
    const results = await analyzeButtonClicks(url);
    console.log(
      `Analysis completed. Found ${results.length} clickable elements`
    );
    res.json({ results });
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
