import { Router } from "express";
import { parseMatchQueryParams } from "../../shared/validators.js";
import { getMatches } from "../services/matchService.js";

export const matchesRouter = Router();

matchesRouter.get("/matches", async (req, res, next) => {
  try {
    const query = parseMatchQueryParams(req.query as Record<string, string | string[] | undefined>);
    const response = await getMatches(query);

    res.json(response);
  } catch (error) {
    next(error);
  }
});