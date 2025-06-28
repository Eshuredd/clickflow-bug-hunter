import express from "express";
import analysisRoutes from "./routes/analysis";

const app = express();
app.use(express.json());

app.use("/api/analysis", analysisRoutes);

export default app;
