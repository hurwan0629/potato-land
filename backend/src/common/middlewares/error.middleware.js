import { logger } from "../logging/logger.js";

export function errorMiddleware(err, req, res, next) {
  logger.error("Unhandled request error", {
    error: err,
    method: req.method,
    path: req.originalUrl,
  });

  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({
    success: false,
    code: err.code ?? "INTERNAL_SERVER_ERROR",
    message: err.message ?? "서버 오류가 발생했습니다.",
  });
}
