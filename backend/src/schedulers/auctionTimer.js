import { logger } from "../common/logging/logger.js";

const MAX_TIMEOUT_MS = 2_147_483_647;
const timers = new Map();
const log = logger.child("auction-timer");

/**
 * timers Map에서 listingIdx에 등록되어있는 setTimer을 삭제해주고, 해당 키밸류를 삭제해주기
 */
function clearEntry(listingIdx) {
  const entry = timers.get(listingIdx);
  if (!entry) return false;

  clearTimeout(entry.timeout);
  timers.delete(listingIdx);
  return true;
}

/**
 * 타이머를 걸어주고 다된 타이머가 실행하는 함수
 * 
 * endsAt를 기준으로 onEnd를 실행하거나 다시 돌려주기를 담당합니다.
 */
function scheduleNext(entry) {
  const remainingMs = entry.endsAt.getTime() - Date.now();
  
  // 타이머가 다 되었다면 바로 실행해주기
  if (remainingMs <= 0) {
    timers.delete(entry.listingIdx);
    Promise.resolve()
      .then(() => entry.onEnd(entry.listingIdx))
      .catch((error) => {
        log.error("경매 종료 처리에 실패했습니다.", {
          error,
          listingIdx: entry.listingIdx,
        });
      });
    return;
  }

  // 처음 시작하거나 아직 시간이 남아있으면 동일한 조건을 실행하는 방식으로 타이머를 다시 실행해주기
  // 여기에서 Node.Timeout객체가 커버할 수 없는 숫자 이내로만 설정해주기.
  entry.timeout = setTimeout(
    () => scheduleNext(entry),
    Math.min(remainingMs, MAX_TIMEOUT_MS),
  );
  entry.timeout.unref?.();
  timers.set(entry.listingIdx, entry);
}


/**
 * 새로운 경매에 대한 타이머를 등록하게 됩니다.
 * 해당 작업에서는 DB에 저장하거나 알림을 보내는 함수는 등록되지 않고 모든 작업은 onEnd에서 동작하게 됩니다.
 * 
 * 1번인자: listingIdx
 * 2번인자: 종료 날짜
 * 3번인자: function(listingIdx) 로 경매를 종료 시킬 때 동작하는 함수
 */
export function scheduleAuctionEnd(listingIdx, endsAt, onEnd) {
  const normalizedListingIdx = Number(listingIdx);
  const normalizedEndsAt = new Date(endsAt);

  if (!Number.isInteger(normalizedListingIdx) || normalizedListingIdx <= 0) {
    throw new TypeError("올바른 listingIdx가 필요합니다.");
  }
  if (Number.isNaN(normalizedEndsAt.getTime())) {
    throw new TypeError("올바른 경매 종료 시각이 필요합니다.");
  }
  if (typeof onEnd !== "function") {
    throw new TypeError("경매 종료 처리 함수가 필요합니다.");
  }

  clearEntry(normalizedListingIdx);
  scheduleNext({
    listingIdx: normalizedListingIdx,
    endsAt: normalizedEndsAt,
    onEnd,
    timeout: null,
  });
}

export function cancelAuctionEnd(listingIdx) {
  return clearEntry(Number(listingIdx));
}

export function clearAuctionTimers() {
  for (const entry of timers.values()) {
    clearTimeout(entry.timeout);
  }
  timers.clear();
}

export function hasAuctionTimer(listingIdx) {
  return timers.has(Number(listingIdx));
}

export function getAuctionTimerCount() {
  return timers.size;
}
