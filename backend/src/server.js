import http from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./common/logging/logger.js";
import { createSocketServer } from "./sockets/index.js";

// 어플리케이션 express 등록
const httpServer = http.createServer(app);
// 소켓 이벤트 및 emit
const socketServer = createSocketServer(httpServer);

// TODO: DB 연결 초기화
// TODO: Redis 연결 초기화
// TODO: Auction recovery scheduler 시작

// [2026-08-02 21:52:25] node 서버 생성 및 시작
httpServer.listen(env.server.port, env.server.host, () => {
  logger.info("HTTP server listening", {
    host: env.server.host,
    port: env.server.port,
    nodeEnv: env.nodeEnv,
  });
});

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Shutdown signal received", { signal });

  socketServer.close(() => {
    // TODO: scheduler stop - 필요 없는 cron 자원 없애주기
    // TODO: redis disconnect - 서버의 redis client의 상태 정리해주기
    // TODO: database close - 서버의 database 연결 상태 정리해주기

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
