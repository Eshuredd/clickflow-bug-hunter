import express from "express";
import { analyzeButtonClicks } from "../services/bugDetectionService";

const router = express.Router();

router.post("/button-clicks", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const results = await analyzeButtonClicks(url);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
