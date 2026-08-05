import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";

/** 로그인 사용자용 access/refresh JWT와 세션 식별자를 함께 생성한다. */
export function createLoginTokens(user, { sessionId = randomUUID() } = {}) {
  // sid는 기기를, jti는 개별 토큰 발급본을 구분한다.
  const accessJti = randomUUID();
  const refreshJti = randomUUID();
  const subject = String(user.idx);
  // Access Token에는 보호 API 권한 확인에 필요한 role을 포함한다.
  const accessToken = jwt.sign(
    { sid: sessionId, jti: accessJti, type: "access", role: user.role },
    env.jwt.accessToken.secret,
    { subject, expiresIn: env.jwt.accessToken.expiresInSec },
  );
  // Refresh Token은 재발급 전용이므로 최소한의 세션 claim만 포함한다.
  const refreshToken = jwt.sign(
    { sid: sessionId, jti: refreshJti, type: "refresh" },
    env.jwt.refreshToken.secret,
    { subject, expiresIn: env.jwt.refreshToken.expiresInSec },
  );
  return { sessionId, refreshJti, accessToken, refreshToken };
}

/** Refresh Token의 서명과 필수 claim을 검증해 안전한 세션 식별 정보를 반환한다. */
export function verifyRefreshToken(token) {
  // 서명과 exp는 jsonwebtoken.verify가 먼저 검증한다.
  const payload = jwt.verify(token, env.jwt.refreshToken.secret);
  const userIdx = Number(payload.sub);

  // Access Token 혼용과 비정상 세션 식별자를 명시적으로 차단한다.
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
  // JavaScript에서 토큰을 읽지 못하게 하고 환경별 Secure·SameSite 정책을 공통 적용한다.
  return { httpOnly: env.cookie.httpOnly, secure: env.cookie.secure, sameSite: env.cookie.sameSite, maxAge: maxAge * 1000, path };
}

/** 생성한 access/refresh JWT를 각 문서 경로의 HttpOnly 쿠키로 설정한다. */
export function setLoginCookies(res, tokens) {
  // Access 쿠키는 전체 API에, Refresh 쿠키는 refresh 하위 경로에만 전송한다.
  res.cookie("access_token", tokens.accessToken, cookieOptions(env.jwt.accessToken.expiresInSec, env.jwt.accessToken.cookiePath));
  res.cookie("refresh_token", tokens.refreshToken, cookieOptions(env.jwt.refreshToken.expiresInSec, env.jwt.refreshToken.cookiePath));
}

/** 브라우저에 저장된 access/refresh 인증 쿠키를 각각의 원래 경로에서 만료시킨다. */
export function clearLoginCookies(res) {
  // 생성할 때와 같은 path를 지정해야 브라우저가 기존 쿠키를 정확히 삭제한다.
  res.clearCookie("access_token", cookieOptions(0, env.jwt.accessToken.cookiePath));
  res.clearCookie("refresh_token", cookieOptions(0, env.jwt.refreshToken.cookiePath));
}
