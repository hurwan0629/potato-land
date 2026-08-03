import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";

/** 로그인 사용자용 access/refresh JWT와 세션 식별자를 함께 생성한다. */
export function createLoginTokens(user) {
  const sessionId = randomUUID();
  const accessJti = randomUUID();
  const refreshJti = randomUUID();
  const subject = String(user.idx);
  const accessToken = jwt.sign(
    { sid: sessionId, jti: accessJti, type: "access", role: user.role },
    env.jwt.accessToken.secret,
    { subject, expiresIn: env.jwt.accessToken.expiresInSec },
  );
  const refreshToken = jwt.sign(
    { sid: sessionId, jti: refreshJti, type: "refresh" },
    env.jwt.refreshToken.secret,
    { subject, expiresIn: env.jwt.refreshToken.expiresInSec },
  );
  return { sessionId, refreshJti, accessToken, refreshToken };
}

/** 인증 쿠키에 공통 적용할 보안 옵션을 만든다. */
function cookieOptions(maxAge, path) {
  return { httpOnly: env.cookie.httpOnly, secure: env.cookie.secure, sameSite: env.cookie.sameSite, maxAge: maxAge * 1000, path };
}

/** 생성한 access/refresh JWT를 각 문서 경로의 HttpOnly 쿠키로 설정한다. */
export function setLoginCookies(res, tokens) {
  res.cookie("access_token", tokens.accessToken, cookieOptions(env.jwt.accessToken.expiresInSec, env.jwt.accessToken.cookiePath));
  res.cookie("refresh_token", tokens.refreshToken, cookieOptions(env.jwt.refreshToken.expiresInSec, env.jwt.refreshToken.cookiePath));
}
