import { logger } from "../logging/logger.js";

const log = logger.child("http-error");

/**
 * express 미들웨어 전체에서 마지막에 에러를 모두 받아주는 객체입니다.
 * 
 * err 객체에 status, expose, code, message가 있으면 그것을 그대로 사용하며 없으면 기본값을 사용합니다. 
 * 
 * 로그를 출력합니다.
 */
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
