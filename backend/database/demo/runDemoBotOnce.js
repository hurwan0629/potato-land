import { logger } from "../../src/common/logging/logger.js";
import { env } from "../../src/config/env.js";
import { createDemoBot } from "../../src/demo/demoBot.js";
import {
  closeDatabase,
  connectDatabase,
} from "../../src/infrastructure/database/database.js";
import {
  connectRedis,
  disconnectRedis,
} from "../../src/infrastructure/redis/redisClient.js";

const log = logger.child("demo-bot:once");

async function runDemoBotOnce() {
  if (env.nodeEnv !== "development") {
    throw new Error("데모 봇 수동 실행은 development 환경에서만 가능합니다.");
  }

  await connectDatabase();
  await connectRedis();

  const bot = createDemoBot({
    io: null,
    nodeEnv: "development",
    enabled: true,
    intervalMs: Math.max(env.demoBot.intervalMs, 1_000),
  });

  // 경매 입찰, 채팅 메시지, 후기 작업을 각각 한 번씩 실행한다.
  const results = [
    await bot.runOnce(),
    await bot.runOnce(),
    await bot.runOnce(),
  ];

  log.info("데모 봇 수동 1회 검증을 완료했습니다.", { results });
  console.log(JSON.stringify(results, null, 2));
}

try {
  await runDemoBotOnce();
} catch (error) {
  log.error("데모 봇 수동 검증에 실패했습니다.", { error });
  process.exitCode = 1;
} finally {
  await Promise.allSettled([disconnectRedis(), closeDatabase()]);
}
