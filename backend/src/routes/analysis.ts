import express, { Request, Response } from "express";
import { analyzeButtonClicks } from "../services/bugDetectionService";

const router = express.Router();

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
