import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";
import { query } from "../../infrastructure/database/database.js";

function unauthorized(message = "로그인이 필요합니다.") {
  return new AppError({
    status: 401,
    code: "UNAUTHORIZED",
    message,
  });
}

function normalizeUser(row) {
  return {
    userIdx: Number(row.userIdx),
    nickname: row.nickname,
    profileImageUrl: row.profileImageUrl,
    role: row.role,
  };
}

export function getAccessTokenFromCookieHeader(cookieHeader) {
  if (typeof cookieHeader !== "string" || cookieHeader === "") {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === "access_token") {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

export async function authenticateAccessToken(accessToken) {
  if (typeof accessToken !== "string" || accessToken.trim() === "") {
    throw unauthorized();
  }

  let auth;
  try {
    auth = jwt.verify(accessToken, env.jwt.accessToken.secret);
  } catch {
    throw unauthorized("로그인 정보가 유효하지 않습니다.");
  }

  if (
    !auth ||
    auth.type !== "access" ||
    typeof auth.sub !== "string" ||
    !/^\d+$/.test(auth.sub)
  ) {
    throw unauthorized("로그인 정보가 유효하지 않습니다.");
  }

  const { rows } = await query(
    `
      SELECT
        idx AS "userIdx",
        nickname,
        profile_image AS "profileImageUrl",
        role,
        deleted_at AS "deletedAt",
        banned_at AS "bannedAt"
      FROM users
      WHERE idx = $1
    `,
    [auth.sub],
  );
  const user = rows[0];

  if (!user || user.deletedAt) {
    throw unauthorized();
  }
  if (user.bannedAt) {
    throw new AppError({
      status: 403,
      code: "BANNED_USER",
      message: "정지된 사용자는 접근할 수 없습니다.",
    });
  }

  return {
    auth,
    user: normalizeUser(user),
  };
}

export async function requireAuth(req, _res, next) {
  try {
    const authenticated = await authenticateAccessToken(req.cookies?.access_token);
    req.auth = authenticated.auth;
    req.user = authenticated.user;
    next();
  } catch (error) {
    next(error);
  }
}
