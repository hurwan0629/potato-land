import pg from "pg";

import { logger } from "../../common/logging/logger.js";
import { env } from "../../config/env.js";

const { Pool } = pg;
const log = logger.child("database");

const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
});

let connected = false;

pool.on("error", (error) => {
  log.error("유휴 PostgreSQL 연결에서 오류가 발생했습니다.", { error });
});

export async function connectDatabase() {
  if (connected) return;

  await pool.query("SELECT 1");
  connected = true;
  log.info("PostgreSQL 연결을 확인했습니다.");
}

export function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(work) {
  if (typeof work !== "function") {
    throw new TypeError("트랜잭션 작업 함수가 필요합니다.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  if (!connected) return;

  await pool.end();
  connected = false;
  log.info("PostgreSQL 연결을 종료했습니다.");
}
