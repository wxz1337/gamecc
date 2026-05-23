import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { matchesRouter } from "./routes/matches.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);

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

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
