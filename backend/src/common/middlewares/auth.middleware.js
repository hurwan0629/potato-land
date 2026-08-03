import jwt from "jsonwebtoken";

import { AppError } from "../errors/AppError.js";
import { env } from "../../config/env.js";

/** access_token 쿠키를 검증하고 JWT claim을 req.auth에 저장한다. */
export function requireAuth(req, _res, next) {
  const token = req.cookies.access_token;
  if (!token) return next(new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다."));
  try {
    const payload = jwt.verify(token, env.jwt.accessToken.secret);
    if (payload.type !== "access") throw new Error("invalid token type");
    req.auth = { userIdx: Number(payload.sub), sessionId: payload.sid, role: payload.role };
    return next();
  } catch {
    return next(new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다."));
  }
}
