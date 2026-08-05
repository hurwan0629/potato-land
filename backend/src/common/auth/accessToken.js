import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { query } from "../../infrastructure/database/database.js";
import { AppError } from "../errors/AppError.js";

function unauthorized(message = "로그인이 필요합니다.") {
  return new AppError({ status: 401, code: "UNAUTHORIZED", message });
}

function normalizeUser(row) {
  return Object.freeze({
    userIdx: Number(row.userIdx),
    nickname: row.nickname,
    profileImageUrl: row.profileImageUrl,
    role: row.role,
  });
}

function normalizeAuth(payload) {
  return Object.freeze({
    ...payload,
    userIdx: Number(payload.sub),
    sessionId: payload.sid ?? null,
  });
}

export function getAccessTokenFromCookieHeader(cookieHeader) {
  if (typeof cookieHeader !== "string" || cookieHeader === "") return null;

  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === "access_token") return decodeURIComponent(valueParts.join("="));
  }
  return null;
}

/**
 * Access Token 인증의 단일 진입점이다.
 *
 * 1. JWT 서명·만료·type·subject를 검증한다.
 * 2. DB에서 현재 사용자 상태를 다시 조회한다.
 * 3. 탈퇴 계정은 401, 정지 계정은 403으로 차단한다.
 * 4. Controller와 Socket이 함께 쓰는 auth/user 객체를 반환한다.
 */
export async function authenticateAccessToken(accessToken) {
  if (typeof accessToken !== "string" || accessToken.trim() === "") {
    throw unauthorized();
  }

  let payload;
  try {
    payload = jwt.verify(accessToken, env.jwt.accessToken.secret);
  } catch {
    throw unauthorized("로그인 정보가 유효하지 않습니다.");
  }

  if (
    !payload ||
    payload.type !== "access" ||
    typeof payload.sub !== "string" ||
    !/^\d+$/.test(payload.sub)
  ) {
    throw unauthorized("로그인 정보가 유효하지 않습니다.");
  }

  const { rows } = await query(
    `SELECT
       idx AS "userIdx",
       nickname,
       profile_image AS "profileImageUrl",
       role,
       deleted_at AS "deletedAt",
       banned_at AS "bannedAt"
     FROM users
     WHERE idx = $1`,
    [payload.sub],
  );
  const user = rows[0];

  if (!user || user.deletedAt) throw unauthorized();
  if (user.bannedAt) {
    throw new AppError({
      status: 403,
      code: "BANNED_USER",
      message: "정지된 사용자는 접근할 수 없습니다.",
    });
  }

  return { auth: normalizeAuth(payload), user: normalizeUser(user) };
}

function attachAuthenticated(req, authenticated) {
  req.auth = authenticated.auth;
  req.user = authenticated.user;
}

export async function requireAuth(req, _res, next) {
  try {
    attachAuthenticated(
      req,
      await authenticateAccessToken(req.cookies?.access_token),
    );
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 공개 API에서 token이 없으면 그대로 진행한다.
 * token이 있다면 requireAuth와 동일하게 DB 사용자 상태까지 검증한다.
 */
export async function optionalAuth(req, _res, next) {
  const token = req.cookies?.access_token;
  if (!token) return next();

  try {
    attachAuthenticated(req, await authenticateAccessToken(token));
    return next();
  } catch (error) {
    return next(error);
  }
}

/** requireAuth 뒤에서 현재 DB role을 검사한다. */
export function requireRole(...allowedRoles) {
  const roles = new Set(allowedRoles.flat().map((role) => String(role).toUpperCase()));
  if (roles.size === 0) throw new TypeError("허용할 role이 필요합니다.");

  return function roleMiddleware(req, _res, next) {
    if (!req.user) return next(unauthorized());
    if (!roles.has(req.user.role)) {
      return next(
        new AppError({
          status: 403,
          code: "FORBIDDEN",
          message: "요청을 수행할 권한이 없습니다.",
        }),
      );
    }
    return next();
  };
}
