import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { matchesRouter } from "./routes/matches.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "esports-schedule-api",
      timezone: process.env.DEFAULT_TIMEZONE ?? "Asia/Shanghai"
    });
  });

  app.use("/api", matchesRouter);
  app.use(errorHandler);

  return app;
}
