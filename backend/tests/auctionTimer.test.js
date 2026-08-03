import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelAuctionEnd,
  clearAuctionTimers,
  getAuctionTimerCount,
  hasAuctionTimer,
  scheduleAuctionEnd,
} from "../src/schedulers/auctionTimer.js";

test.afterEach(() => clearAuctionTimers());

test("이미 끝난 경매는 즉시 종료 처리한다", async () => {
  const called = [];

  scheduleAuctionEnd(10, new Date(Date.now() - 1), (listingIdx) => {
    called.push(listingIdx);
  });
  await Promise.resolve();

  assert.deepEqual(called, [10]);
  assert.equal(hasAuctionTimer(10), false);
});

test("같은 경매를 다시 등록하면 기존 Timer를 교체한다", () => {
  const endsAt = new Date(Date.now() + 60_000);

  scheduleAuctionEnd(20, endsAt, () => {});
  scheduleAuctionEnd(20, endsAt, () => {});

  assert.equal(getAuctionTimerCount(), 1);
  assert.equal(cancelAuctionEnd(20), true);
  assert.equal(cancelAuctionEnd(20), false);
});

test("종료 함수가 동기 예외를 던져도 Timer 호출부로 전파하지 않는다", async () => {
  const originalError = console.error;
  console.error = () => {};

  try {
    assert.doesNotThrow(() => {
      scheduleAuctionEnd(30, new Date(Date.now() - 1), () => {
        throw new Error("종료 실패");
      });
    });
    await Promise.resolve();
    await Promise.resolve();
  } finally {
    console.error = originalError;
  }

  assert.equal(hasAuctionTimer(30), false);
});
