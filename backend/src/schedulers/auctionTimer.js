import { logger } from "../common/logging/logger.js";

const MAX_TIMEOUT_MS = 2_147_483_647;
const timers = new Map();
const log = logger.child("auction-timer");

function clearEntry(listingIdx) {
  const entry = timers.get(listingIdx);
  if (!entry) return false;

  clearTimeout(entry.timeout);
  timers.delete(listingIdx);
  return true;
}

function scheduleNext(entry) {
  const remainingMs = entry.endsAt.getTime() - Date.now();

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

  entry.timeout = setTimeout(
    () => scheduleNext(entry),
    Math.min(remainingMs, MAX_TIMEOUT_MS),
  );
  entry.timeout.unref?.();
  timers.set(entry.listingIdx, entry);
}

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
