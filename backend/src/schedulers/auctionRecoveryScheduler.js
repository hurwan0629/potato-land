import cron from "node-cron";

import { logger } from "../common/logging/logger.js";
import { env } from "../config/env.js";

let recoveryTask = null;
let recoveryRunning = false;
const log = logger.child("auction-recovery");

/**
 * 인자로 주기적으로 실행할 함수를 넣으면 해당 함수를 주기적으로 실행하게 됩니다.
 * 
 * 본 함수의 취지는 Auction 타이머 중 데이터베이스에서는 ON_GOING이지만 auctionTimers에는 존재하지 않는 타이머를 다시 만들어주는 것입니다.
 */
export function startAuctionRecoveryScheduler(recoverAuctions) {
  if (recoveryTask) return recoveryTask;
  if (typeof recoverAuctions !== "function") {
    throw new TypeError("누락 경매 복구 함수가 필요합니다.");
  }
  if (!cron.validate(env.recoveryScheduler.recoveryCron)) {
    throw new Error("AUCTION_RECOVERY_CRON 형식이 올바르지 않습니다.");
  }

  // 매 주기별로 동작할 작업을 등록해주기.
  // 여기에서 cron은 node-cron의 모듈입니다.
  recoveryTask = cron.schedule(env.recoveryScheduler.recoveryCron, async () => {
    if (recoveryRunning) {
      log.warn("이전 경매 복구 작업이 실행 중이므로 이번 주기를 건너뜁니다.");
      return;
    }

    // 실행 시작
    recoveryRunning = true;
    try {
      // 실행
      await recoverAuctions();
    } catch (error) {
      log.error("누락 경매 복구 작업에 실패했습니다.", { error });
    } finally {
      // 작업이 끝나면 다시 running을 false로 설정해주기
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
