import pg from "pg";

import { env } from "./env.js";

const { Pool } = pg;

export const db = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
});

/** PostgreSQL 연결 가능 여부를 확인한다. */
export async function connectDatabase() {
  await db.query("SELECT 1");
}

/** 서버 종료 시 PostgreSQL 연결 풀을 안전하게 닫는다. */
export async function closeDatabase() {
  await db.end();
}
