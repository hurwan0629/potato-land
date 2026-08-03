import http from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./common/logging/logger.js";
import { createSocketServer } from "./sockets/index.js";
import { closeDatabase, connectDatabase } from "./config/db.js";
import { closeRedis, connectRedis, onRedisError } from "./config/redis.js";

// 어플리케이션 express 등록
const httpServer = http.createServer(app);
// 소켓 이벤트 및 emit
const socketServer = createSocketServer(httpServer);

/** PostgreSQL과 Redis 연결을 완료한 후 HTTP 서버를 시작한다. */
async function startServer() {
  onRedisError((error) => logger.error("Redis client error", { error }));
  await connectDatabase();
  await connectRedis();
  httpServer.listen(env.server.port, env.server.host, () => {
    logger.info("HTTP server listening", { host: env.server.host, port: env.server.port, nodeEnv: env.nodeEnv });
  });
}

// TODO: Auction recovery scheduler 시작

startServer().catch((error) => {
  logger.error("Server startup failed", { error });
  process.exitCode = 1;
});

let isShuttingDown = false;

/** 종료 신호를 한 번만 처리하고 외부 연결을 순서대로 닫는다. */
function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Shutdown signal received", { signal });

  socketServer.close(async () => {
    // TODO: scheduler stop
    await Promise.allSettled([closeRedis(), closeDatabase()]);

    logger.info("shutdown completed");
    process.exit(0);
  });

  // httpServer.close((error) => {
  //   if (error) {
  //     logger.error("HTTP server close failed", { error });
  //     process.exitCode = 1;
  //   }
  //   process.exit();
  // });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
