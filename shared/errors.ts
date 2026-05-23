export const ERROR_CODES = {
  INVALID_DATE: "INVALID_DATE",
  INVALID_GAME: "INVALID_GAME",
  TOKEN_MISSING: "TOKEN_MISSING",
  PANDASCORE_REQUEST_FAILED: "PANDASCORE_REQUEST_FAILED",
  PANDASCORE_TIMEOUT: "PANDASCORE_TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}