import assert from "node:assert/strict";
import test from "node:test";

import { logger } from "../src/common/logging/logger.js";

test("로그에 ISO 시각과 모듈 위치를 넣고 민감값을 가린다", () => {
  const calls = [];
  const originalInfo = console.info;
  console.info = (...args) => calls.push(args);

  try {
    logger.child("auth-service").info("로그인 처리", {
      loginId: "potato",
      accessToken: "secret",
    });
  } finally {
    console.info = originalInfo;
  }

  assert.match(
    calls[0][0],
    /^\[\d{4}-\d{2}-\d{2}T.*Z\] \[INFO\] \[auth-service\] 로그인 처리$/,
  );
  assert.deepEqual(calls[0][1], {
    loginId: "potato",
    accessToken: "[REDACTED]",
  });
});
