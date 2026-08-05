import jwt from "jsonwebtoken";

import { AppError } from "../errors/AppError.js";
import { env } from "../../config/env.js";

/** access_token 쿠키를 검증하고 JWT claim을 req.auth에 저장한다. */
export function requireAuth(req, _res, next) {
  // HttpOnly 쿠키는 브라우저가 자동 전송하므로 요청 쿠키에서 직접 읽는다.
  const token = req.cookies.access_token;
  if (!token) return next(new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다."));
  try {
    // 서명과 만료 시각을 검증하고 Refresh Token이 섞이지 않았는지 확인한다.
    const payload = jwt.verify(token, env.jwt.accessToken.secret);
    if (payload.type !== "access") throw new Error("invalid token type");

    // 이후 Controller와 Service가 공통으로 사용할 최소 인증 정보를 요청에 저장한다.
    req.auth = { userIdx: Number(payload.sub), sessionId: payload.sid, role: payload.role };
    return next();
  } catch {
    // 만료·변조·잘못된 타입은 내부 JWT 오류를 노출하지 않고 같은 401로 처리한다.
    return next(new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다."));
  }
}
