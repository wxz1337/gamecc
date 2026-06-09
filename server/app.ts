import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createReadStream, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { errorHandler } from "./middleware/errorHandler.js";
import { matchesRouter } from "./routes/matches.js";
import { TEAM_ICONS_DIR } from "./services/teamIconService.js";

const TEAM_ICON_CACHE_CONTROL = "public, max-age=86400, immutable";
const TEAM_ICON_FILE_NAME_PATTERN = /^[a-zA-Z0-9_-]+(?:_dark)?\.(png|jpg|jpeg|webp|svg)$/;
const TEAM_ICON_CONTENT_TYPES: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function isSafeTeamIconPath(filePath: string): boolean {
  const pathFromIconsDir = relative(TEAM_ICONS_DIR, filePath);
  return pathFromIconsDir !== "" && !pathFromIconsDir.startsWith("..");
}

function getTeamIconContentType(fileName: string): string {
  return TEAM_ICON_CONTENT_TYPES[extname(fileName).toLocaleLowerCase("en-US")] ?? "application/octet-stream";
}

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

  app.get("/api/team-icons/:fileName", (req: Request<{ fileName: string }>, res: Response, next: NextFunction) => {
    const fileName = req.params.fileName;

    if (!TEAM_ICON_FILE_NAME_PATTERN.test(fileName)) {
      res.status(400).json({ error: "Invalid file name" });
      return;
    }

    const filePath = resolve(TEAM_ICONS_DIR, fileName);

    if (!isSafeTeamIconPath(filePath)) {
      res.status(400).json({ error: "Invalid file name" });
      return;
    }

    let fileStats;
    try {
      fileStats = statSync(filePath);
    } catch {
      res.status(404).json({ error: "Icon not found" });
      return;
    }

    if (!fileStats.isFile()) {
      res.status(404).json({ error: "Icon not found" });
      return;
    }

    res.setHeader("Content-Type", getTeamIconContentType(fileName));
    res.setHeader("Cache-Control", TEAM_ICON_CACHE_CONTROL);
    createReadStream(filePath).on("error", next).pipe(res);
  });

  app.use(errorHandler);

  return app;
}
