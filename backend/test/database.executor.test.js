import assert from "node:assert/strict";
import test from "node:test";

import { executeQuery } from "../src/infrastructure/database/executor.js";

test("executeQuery는 공통 query 함수를 실행한다", async () => {
  const calls = [];
  const result = await executeQuery(async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ ok: true }] };
  }, "SELECT $1", [1]);

  assert.deepEqual(result.rows, [{ ok: true }]);
  assert.deepEqual(calls, [{ sql: "SELECT $1", params: [1] }]);
});

test("executeQuery는 transaction client를 실행한다", async () => {
  const client = {
    async query(sql, params) {
      return { rows: [{ sql, params }] };
    },
  };

  const result = await executeQuery(client, "SELECT $1", [2]);
  assert.deepEqual(result.rows[0], { sql: "SELECT $1", params: [2] });
});

test("executeQuery는 잘못된 실행 객체를 거부한다", () => {
  assert.throws(
    () => executeQuery(null, "SELECT 1", []),
    /올바른 데이터베이스 실행 객체/,
  );
});
