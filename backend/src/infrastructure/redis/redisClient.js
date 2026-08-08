import { createClient } from "redis";

import { logger } from "../../common/logging/logger.js";
import { env } from "../../config/env.js";

// log.[level](message, scope) -> [time] [level] [scope] message {data} 형태로 출력합니다.
const log = logger.child("redis");


/**
 * Upstash Redis 연결 클라이언트
 * 
 * REDIS_URL 안에 username, password, host, port 정보가 모두 포함되어 있습니다.
 * 
 */
const redisClient = createClient({
  // url: env.redis.url,
  password: env.redis.password,
  // 연결할 redis 서버의 재접속 주기를 설정해줍니다.
  socket: {
    host: env.redis.host,
    port: env.redis.port,
    reconnectStrategy(retries) {
      return Math.min(retries * 100, 3000);
    },
  },
});


// 에러가 발생하면 로그 출력을 해줍니다.
redisClient.on("error", (error) => {
  log.error("Redis 연결 오류가 발생했습니다.", { error });
});

/**
 * redis를 연결해줍니다.
 * 
 * redisClient의 isOpen 속성을 이용해서 연결이 이미 되어있다면 그대로 연결을 유지해줍니다.
 */
export async function connectRedis() {
  if (redisClient.isOpen) return;

  await redisClient.connect();
  // ping를 한번 시도하여 연결이 되었는지 확인하게 됩니다.
  // 실패하면 에러가 납니다.
  await redisClient.ping();
  log.info("Redis 연결을 확인했습니다.");
}

/**
 * redisClient가 존재한다면 redis 객체를 반환해줍니다.
 */
export function getRedisClient() {
  if (!redisClient.isReady) {
    throw new Error("Redis client가 아직 준비되지 않았습니다.");
  }

  return redisClient;
}

/**
 * 서버가 종료될 시 redis client를 반환해줍니다.
 */
export async function disconnectRedis() {
  if (!redisClient.isOpen) return;

  await redisClient.close();
  log.info("Redis 연결을 종료했습니다.");
}
