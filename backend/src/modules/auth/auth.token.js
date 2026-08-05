import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";

/** 로그인 사용자용 access/refresh JWT와 세션 식별자를 함께 생성한다. */
export function createLoginTokens(user, { sessionId = randomUUID() } = {}) {
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

/** Refresh Token의 서명과 필수 claim을 검증해 안전한 세션 식별 정보를 반환한다. */
export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwt.refreshToken.secret);
  const userIdx = Number(payload.sub);
  if (payload.type !== "refresh" || !Number.isSafeInteger(userIdx) || userIdx <= 0 || !payload.sid || !payload.jti) {
    throw new Error("invalid refresh token claims");
  }
  return {
    userIdx,
    sessionId: String(payload.sid),
    refreshJti: String(payload.jti),
  };
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

/** 브라우저에 저장된 access/refresh 인증 쿠키를 각각의 원래 경로에서 만료시킨다. */
export function clearLoginCookies(res) {
  res.clearCookie("access_token", cookieOptions(0, env.jwt.accessToken.cookiePath));
  res.clearCookie("refresh_token", cookieOptions(0, env.jwt.refreshToken.cookiePath));
}
