import { createClient } from "redis";

import { logger } from "../../common/logging/logger.js";
import { env } from "../../config/env.js";

const log = logger.child("redis");

const redisClient = createClient({
  password: env.redis.password,
  socket: {
    host: env.redis.host,
    port: env.redis.port,
    reconnectStrategy(retries) {
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (error) => {
  log.error("Redis 연결 오류가 발생했습니다.", { error });
});

export async function connectRedis() {
  if (redisClient.isOpen) return;

  await redisClient.connect();
  await redisClient.ping();
  log.info("Redis 연결을 확인했습니다.");
}

export function getRedisClient() {
  if (!redisClient.isReady) {
    throw new Error("Redis client가 아직 준비되지 않았습니다.");
  }

  return redisClient;
}

export async function disconnectRedis() {
  if (!redisClient.isOpen) return;

  await redisClient.close();
  log.info("Redis 연결을 종료했습니다.");
}
