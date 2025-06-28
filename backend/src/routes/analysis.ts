
import express from "express";
import { analyzeButtonClicks } from "../services/bugDetectionService";

const router = express.Router();

router.post("/button-clicks", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    console.log(`Starting analysis for URL: ${url}`);
    const results = await analyzeButtonClicks(url);
    console.log(`Analysis completed. Found ${results.length} clickable elements`);
    res.json({ results });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
