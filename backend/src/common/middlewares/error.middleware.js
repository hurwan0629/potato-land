import { logger } from "../logging/logger.js";

const log = logger.child("http-error");

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
      ? err.status
      : 500;
  const expose = err.expose ?? status < 500;

  log[status >= 500 ? "error" : "warn"]("HTTP 요청 처리에 실패했습니다.", {
    error: err,
    method: req.method,
    path: req.originalUrl,
    status,
  });

  const body = {
    success: false,
    code: expose && err.code ? err.code : "INTERNAL_SERVER_ERROR",
    message:
      expose && err.message ? err.message : "서버 오류가 발생했습니다.",
  };

  if (expose && err.details !== undefined) {
    body.details = err.details;
  }

  return res.status(status).json(body);
}
