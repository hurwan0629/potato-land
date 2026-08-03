import assert from "node:assert/strict";
import test from "node:test";

import { redisKey } from "../src/infrastructure/redis/redisKey.js";

test("Redis key 이름을 문서 계약대로 만든다", () => {
  assert.equal(redisKey.session(3, "session-id"), "session:3:session-id");
  assert.equal(
    redisKey.phoneCode("010-1234-5678", "signup"),
    "phone:code:01012345678:SIGNUP",
  );
  assert.equal(
    redisKey.phoneVerified("01012345678", "change_phone"),
    "phone:verified:01012345678:CHANGE_PHONE",
  );
  assert.equal(
    redisKey.phoneCooldown("01012345678", "find_id"),
    "phone:cooldown:01012345678:FIND_ID",
  );
  assert.equal(redisKey.auctionState(7), "auction:state:7");
});
