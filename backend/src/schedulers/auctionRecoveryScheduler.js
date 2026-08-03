import cron from "node-cron";

import { logger } from "../common/logging/logger.js";
import { env } from "../config/env.js";

let recoveryTask = null;
let recoveryRunning = false;
const log = logger.child("auction-recovery");

export function startAuctionRecoveryScheduler(recoverAuctions) {
  if (recoveryTask) return recoveryTask;
  if (typeof recoverAuctions !== "function") {
    throw new TypeError("누락 경매 복구 함수가 필요합니다.");
  }
  if (!cron.validate(env.recoveryScheduler.recoveryCron)) {
    throw new Error("AUCTION_RECOVERY_CRON 형식이 올바르지 않습니다.");
  }

  recoveryTask = cron.schedule(env.recoveryScheduler.recoveryCron, async () => {
    if (recoveryRunning) {
      log.warn("이전 경매 복구 작업이 실행 중이므로 이번 주기를 건너뜁니다.");
      return;
    }

    recoveryRunning = true;
    try {
      await recoverAuctions();
    } catch (error) {
      log.error("누락 경매 복구 작업에 실패했습니다.", { error });
    } finally {
      recoveryRunning = false;
    }
  });

  log.info("경매 복구 Scheduler를 시작했습니다.", {
    cron: env.recoveryScheduler.recoveryCron,
  });
  return recoveryTask;
}

export function stopAuctionRecoveryScheduler() {
  if (!recoveryTask) return;

  recoveryTask.stop();
  recoveryTask.destroy();
  recoveryTask = null;
  recoveryRunning = false;
  log.info("경매 복구 Scheduler를 종료했습니다.");
}
