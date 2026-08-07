import assert from "node:assert/strict";
import test from "node:test";

import {
  createDemoBotScheduler,
  isDemoBotAllowed,
} from "../src/demo/demoBotScheduler.js";

test("데모 봇은 development에서 명시적으로 활성화한 경우에만 허용된다", () => {
  assert.equal(
    isDemoBotAllowed({ nodeEnv: "development", enabled: true }),
    true,
  );
  assert.equal(
    isDemoBotAllowed({ nodeEnv: "development", enabled: false }),
    false,
  );
  assert.equal(
    isDemoBotAllowed({ nodeEnv: "test", enabled: true }),
    false,
  );
  assert.equal(
    isDemoBotAllowed({ nodeEnv: "production", enabled: true }),
    false,
  );
});

test("데모 봇은 등록된 작업을 순서대로 순환한다", async () => {
  const executed = [];
  let scheduledCallback = null;
  let clearedTimer = null;

  const bot = createDemoBotScheduler({
    nodeEnv: "development",
    enabled: true,
    intervalMs: 1_000,
    actionHandlers: {
      auctionBid: async () => executed.push("auctionBid"),
      chatMessage: async () => executed.push("chatMessage"),
      review: async () => executed.push("review"),
    },
    setIntervalFn(callback) {
      scheduledCallback = callback;
      return 77;
    },
    clearIntervalFn(timer) {
      clearedTimer = timer;
    },
  });

  assert.equal(bot.start(), true);
  assert.equal(bot.start(), false);
  assert.equal(bot.isStarted, true);

  await bot.runOnce();
  await bot.runOnce();
  await bot.runOnce();
  await bot.runOnce();

  assert.deepEqual(executed, [
    "auctionBid",
    "chatMessage",
    "review",
    "auctionBid",
  ]);
  assert.equal(typeof scheduledCallback, "function");

  assert.equal(bot.stop(), true);
  assert.equal(bot.stop(), false);
  assert.equal(bot.isStarted, false);
  assert.equal(clearedTimer, 77);
});

test("이전 작업이 끝나지 않았으면 다음 타이머 작업을 건너뛴다", async () => {
  let releaseAction;
  let executionCount = 0;
  const pendingAction = new Promise((resolve) => {
    releaseAction = resolve;
  });

  const bot = createDemoBotScheduler({
    nodeEnv: "development",
    enabled: true,
    intervalMs: 1_000,
    actionHandlers: {
      auctionBid: async () => {
        executionCount += 1;
        await pendingAction;
      },
    },
  });

  const first = bot.runOnce();
  const second = await bot.runOnce();

  assert.deepEqual(second, { executed: false, reason: "BUSY" });
  assert.equal(executionCount, 1);

  releaseAction();
  const firstResult = await first;
  assert.equal(firstResult.executed, true);
});

test("비활성 상태에서는 타이머를 만들지 않는다", async () => {
  let intervalCreated = false;
  const bot = createDemoBotScheduler({
    nodeEnv: "production",
    enabled: true,
    intervalMs: 1_000,
    actionHandlers: {
      auctionBid: async () => {},
    },
    setIntervalFn() {
      intervalCreated = true;
      return 1;
    },
  });

  assert.equal(bot.start(), false);
  assert.equal(intervalCreated, false);
  assert.deepEqual(await bot.runOnce(), {
    executed: false,
    reason: "DISABLED",
  });
});
