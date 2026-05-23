import { Router } from "express";
import { parseDateParam, parseGameFilter } from "../../shared/validators.js";
import { getMatches } from "../services/matchService.js";

export const matchesRouter = Router();

matchesRouter.get("/matches", async (req, res, next) => {
  try {
    const date = parseDateParam(typeof req.query.date === "string" ? req.query.date : undefined);
    const game = parseGameFilter(typeof req.query.game === "string" ? req.query.game : undefined);
    const refresh = req.query.refresh === "1";

    const response = await getMatches({
      date,
      game,
      refresh
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});