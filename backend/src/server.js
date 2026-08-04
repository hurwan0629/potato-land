import http from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./common/logging/logger.js";
import {
  closeDatabase,
  connectDatabase,
} from "./infrastructure/database/database.js";
import {
  connectRedis,
  disconnectRedis,
} from "./infrastructure/redis/redisClient.js";
import { clearAuctionTimers } from "./schedulers/auctionTimer.js";
import { stopAuctionRecoveryScheduler } from "./schedulers/auctionRecoveryScheduler.js";
import { createSocketServer } from "./sockets/index.js";

const log = logger.child("server");

// 어플리케이션 express 등록
const httpServer = http.createServer(app);
// 소켓 이벤트 및 emit
const socketServer = createSocketServer(httpServer);

async function startServer() {
  try {
    await connectDatabase();
    await connectRedis();

    // TODO: auction.service의 recoverExpiredAuctions 구현 후
    // startAuctionRecoveryScheduler(recoverExpiredAuctions)를 호출한다.

    httpServer.listen(env.server.port, env.server.host, () => {
      log.info("HTTP 서버가 요청을 기다립니다.", {
        host: env.server.host,
        port: env.server.port,
        nodeEnv: env.nodeEnv,
      });
    });
  } catch (error) {
    log.error("서버 시작에 실패했습니다.", { error });
    await Promise.allSettled([
      closeSocketServer(),
      disconnectRedis(),
      closeDatabase(),
    ]);
    process.exitCode = 1;
  }
}

/**
 * socketServer = { io, close(callback) => {...} }
 */
function closeSocketServer() {
  return new Promise((resolve) => {
    socketServer.close(resolve);
  });
}

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log.info("서버 종료 신호를 받았습니다.", { signal });
  stopAuctionRecoveryScheduler();
  clearAuctionTimers();

  const results = await Promise.allSettled([
    closeSocketServer(),
    disconnectRedis(),
    closeDatabase(),
  ]);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length > 0) {
    log.error("일부 서버 자원을 정상적으로 종료하지 못했습니다.", {
      errors: failed.map((result) => result.reason),
    });
    process.exitCode = 1;
    return;
  }

  log.info("서버 자원을 모두 종료했습니다.");
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void startServer();
