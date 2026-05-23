import type { ErrorRequestHandler } from "express";
import { ERROR_CODES, isAppError } from "../../shared/errors.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isAppError(error)) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message
      }
    });

    return;
  }

  console.error(error);

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "服务暂时不可用，请稍后重试。"
    }
  });
};