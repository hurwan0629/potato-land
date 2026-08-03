import { redis } from "../../config/redis.js";
import { env } from "../../config/env.js";

/** 사용자와 브라우저 세션 조합으로 Redis refresh session key를 만든다. */
function sessionKey(userIdx, sessionId) {
  return `session:${userIdx}:${sessionId}`;
}

/** 로그인 refresh session을 Redis에 7일 TTL로 저장한다. */
export async function saveRefreshSession({ userIdx, sessionId, refreshJti, userAgent, ip }) {
  const now = new Date().toISOString();
  await redis.set(
    sessionKey(userIdx, sessionId),
    JSON.stringify({ currentRefreshJti: refreshJti, userAgent, ip, createdAt: now, rotatedAt: now }),
    { EX: env.jwt.refreshToken.expiresInSec },
  );
}
