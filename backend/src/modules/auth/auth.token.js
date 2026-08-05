import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../../common/errors/AppError.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { redisKey } from "../../infrastructure/redis/redisKey.js";

/** 로그인 사용자용 access/refresh JWT와 세션 식별자를 함께 생성한다. */
export function createLoginTokens(user) {

  const sessionId = randomUUID();
  const accessJti = randomUUID();
  const refreshJti = randomUUID();
  
  const subject = String(user.idx);

  const accessToken = jwt.sign(
    { 
      sid: sessionId, 
      jti: accessJti, 
      type: "access", 
      role: user.role 
    },
    env.jwt.accessToken.secret,
    { 
      subject, 
      expiresIn: env.jwt.accessToken.expiresInSec 
    },
  );
  const refreshToken = jwt.sign(
    { 
      sid: sessionId, 
      jti: refreshJti, 
      type: "refresh" 
    },
    env.jwt.refreshToken.secret,
    { 
      subject, 
      expiresIn: env.jwt.refreshToken.expiresInSec 
    },
  );
  return { sessionId, refreshJti, accessToken, refreshToken };
}

/** 인증 쿠키에 공통 적용할 보안 옵션을 만든다. */
function cookieOptions(maxAge, path) {
  return { 
    httpOnly: env.cookie.httpOnly, 
    secure: env.cookie.secure, 
    sameSite: env.cookie.sameSite, 
    maxAge: maxAge * 1000, 
    path 
  };
}

/** 생성한 access/refresh JWT를 각 문서 경로의 HttpOnly 쿠키로 설정한다. */
export function setLoginCookies(res, tokens) {
  // access_token
  res.cookie(
    "access_token", 
    tokens.accessToken, 
    cookieOptions(env.jwt.accessToken.expiresInSec, env.jwt.accessToken.cookiePath)
  );

  // refresh_token
  res.cookie(
    "refresh_token", 
    tokens.refreshToken, 
    cookieOptions(env.jwt.refreshToken.expiresInSec, env.jwt.refreshToken.cookiePath)
  );
}

export function setLogoutCookies(res) {
  res.cookie(
    "access_token",
    "",
    cookieOptions(0, env.jwt.accessToken.cookiePath)
  )
  
  res.cookie(
    "refresh_token",
    "",
    cookieOptions(0, env.jwt.refreshToken.cookiePath)
  )
}

/**
 * 사용자의 refreshToken이 유효한지 확인해주기
 */
export async function checkUserRefreshCookie({ refreshToken }) {
  try {
    const token = jwt.verify(refreshToken, env.jwt.refreshToken.secret)

    // 사용자 세션이 살아있나?
    const isSessionExists = await getRedisClient().get(redisKey.session(token.sub, token.sid))

    return !!isSessionExists
  }
  catch (e) {
    new AppError({ status: 401, code: "COOKIE_INVALIDATE", message: e.message ?? "로그인이 필요합니다." });
    return false
  }
}