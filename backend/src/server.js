import http from "node:http";

import { logger } from "./common/logging/logger.js";
import { env } from "./config/env.js";
import { app } from "./app.js";
import { closeDatabase, connectDatabase } from "./infrastructure/database/database.js";
import { connectRedis, disconnectRedis } from "./infrastructure/redis/redisClient.js";
import { stopAuctionRecoveryScheduler } from "./schedulers/auctionRecoveryScheduler.js";
import { clearAuctionTimers } from "./schedulers/auctionTimer.js";
import { createSocketServer } from "./sockets/index.js";
import { configureSolApiSmsService } from "./infrastructure/sms/solapiSms.service.js";
import { configureSmsProvider } from "./infrastructure/sms/sms.interface.js";

const log = logger.child("server");
const httpServer = http.createServer(app);
const socketServer = createSocketServer(httpServer);
app.set("io", socketServer.io);

/** PostgreSQL과 Redis 연결을 확인한 뒤 HTTP 서버를 시작한다. */
async function startServer() {
  try {
    // solapi 서버 연결
    // configureSolApiSmsService()
    // 콘솔 출력
    configureSmsProvider(({ from, to, text }) => {
      logger.info(`[dev-sms-service]`, { from, to, text })
    })
    
    await connectDatabase();
    await connectRedis();
    httpServer.listen(env.server.port, env.server.host, () => {
      log.info("HTTP 서버가 요청을 기다립니다.", {
        host: env.server.host,
        port: env.server.port,
        nodeEnv: env.nodeEnv,
      });
    });
  } catch (error) {
    log.error("서버 시작에 실패했습니다.", { error });
    await Promise.allSettled([closeSocketServer(), disconnectRedis(), closeDatabase()]);
    process.exitCode = 1;
  }
}

/** Socket.IO 서버 종료를 Promise 형태로 변환한다. */
function closeSocketServer() {
  return new Promise((resolve) => socketServer.close(resolve));
}

let isShuttingDown = false;

/** 종료 신호를 한 번만 처리하고 타이머 및 외부 연결을 안전하게 정리한다. */
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log.info("서버 종료 신호를 받았습니다.", { signal });
  stopAuctionRecoveryScheduler();
  clearAuctionTimers();

  const results = await Promise.allSettled([closeSocketServer(), disconnectRedis(), closeDatabase()]);
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    log.error("일부 서버 자원이 정상적으로 종료되지 못했습니다.", { errors: failed.map((result) => result.reason) });
    process.exitCode = 1;
    return;
  }
  log.info("서버 자원이 모두 종료되었습니다.");
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
void startServer();
