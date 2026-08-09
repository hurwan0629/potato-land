import pg from "pg";

import { logger } from "../../common/logging/logger.js";
import { env } from "../../config/env.js";

// pg에서 Pool생성자를 꺼내줍니다.
const { Pool } = pg;
// 데이터베이스에서 출력하기 위한 database를 만들어줍니다.
// [시간] [level] [database] 메시지 {데이터} 
// 를 출력하게 됩니다.
const log = logger.child("database");

const databaseUrl = new URL(env.database.url);

const isLocalDatabase = [
  "localhost",
  "127.0.0.1",
  "postgres",
].includes(databaseUrl.hostname);

const pool = new Pool({
  // host: env.database.host,
  // port: env.database.port,
  // database: env.database.name,
  // user: env.database.user,
  // password: env.database.password,
  connectionString: env.database.url,

  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,

  ssl: isLocalDatabase
    ? false
    : {
        rejectUnauthorized: false,
      },
});

let connected = false;

pool.on("error", (error) => {
  log.error("유휴 PostgreSQL 연결에서 오류가 발생했습니다.", { error });
});

/**
 * 데이터베이스에 연결해줍니다.
 * 
 * server.js에서 동작하게 됩니다.
 */
export async function connectDatabase() {
  // if (connected) return;

  // await pool.query("SELECT 1");
  // connected = true;
  // log.info("PostgreSQL 연결을 확인했습니다.");
  if (connected) return;

  const { rows } = await pool.query(`
  SELECT
    CURRENT_DATABASE() AS database_name,
    CURRENT_USER AS database_user,
    NOW() AS connected_at,
    TO_REGCLASS('public.users') AS users_table
  `);

  connected = true;
  log.info("PostgreSQL 연결을 확인했습니다.", {
    databaseName: rows[0].database_name ? "[FOUNDED AND REDACTED]" : "not found",
    databaseUser: rows[0].database_user ? "[FOUNDED AND REDACTED]" : "not found",
    connectedAt: rows[0].connected_at,
    usersTable: rows[0].users_table ? "[FOUNDED AND REDACTED]" : "not found",
  });
}

/**
 * 단순 쿼리는 query(쿼리, 변수)를 통해 작업 가능합니다. (트랜잭션이 없는 경우)
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * 트랜잭션의 경우에는 작업자체 함수를 만들어서 넣어주면 해당 작업을 트랜잭션 범위 안에서 작업해주게 됩니다.
 * 
 * 넣어주는 함수 인자는 세션 객체인 client를 인자로 받을 수 있어야합니다. 또한 결과를 동일하게 반환해줍니다.
 */
export async function withTransaction(work) {
  if (typeof work !== "function") {
    throw new TypeError("트랜잭션 작업 함수가 필요합니다.");
  }

  // 하나의 세션 객체를 받게 됩니다.
  const client = await pool.connect();

  // 쿼리 작업을 안전한 범위 내에서 시작하게 됩니다.
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

// 서버 종료시에 pool.end() 함수를 이용하여 연결되어있는 네트워크 자원을 정리해줍니다.
export async function closeDatabase() {
  if (!connected) return;

  await pool.end();
  connected = false;
  log.info("PostgreSQL 연결을 종료했습니다.");
}
