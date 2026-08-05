import { createClient } from "redis";

import { env } from "./env.js";

export const redis = createClient({
  socket: { host: env.redis.host, port: env.redis.port },
  password: env.redis.password,
});

/** Redis 연결 오류를 로거가 처리할 수 있도록 외부 콜백을 등록한다. */
export function onRedisError(handler) {
  redis.on("error", handler);
}

/** Redis가 아직 연결되지 않았을 때만 연결한다. */
export async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}

/** 서버 종료 시 열려 있는 Redis 연결을 안전하게 닫는다. */
export async function closeRedis() {
  if (redis.isOpen) await redis.quit();
}
