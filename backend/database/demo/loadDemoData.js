import { readFile } from "node:fs/promises";

import { logger } from "../../src/common/logging/logger.js";
import { env } from "../../src/config/env.js";
import {
  closeDatabase,
  connectDatabase,
  query,
} from "../../src/infrastructure/database/database.js";

const log = logger.child("db:demo");
const demoSqlUrl = new URL("./001_demo_scenario.sql", import.meta.url);

function assertDevelopmentEnvironment() {
  if (env.nodeEnv !== "development") {
    throw new Error(
      `개발 더미데이터는 NODE_ENV=development에서만 넣을 수 있습니다: ${env.nodeEnv}`,
    );
  }
}

async function assertSafeDatabase() {
  const { rows } = await query("SELECT CURRENT_DATABASE() AS database_name");
  const databaseName = String(rows[0]?.database_name ?? "");

  if (!databaseName) {
    throw new Error("현재 연결된 데이터베이스 이름을 확인할 수 없습니다.");
  }

  if (/prod|production/i.test(databaseName)) {
    throw new Error(
      `운영 데이터베이스로 추정되는 곳에는 더미데이터를 넣을 수 없습니다: ${databaseName}`,
    );
  }

  return databaseName;
}

async function loadDemoData() {
  assertDevelopmentEnvironment();
  await connectDatabase();

  const databaseName = await assertSafeDatabase();
  const sql = await readFile(demoSqlUrl, "utf8");

  // SQL 내부에서 demo_ 계정과 연결 데이터를 먼저 정리한 뒤 한 트랜잭션으로 재생성한다.
  await query(sql);

  const { rows } = await query(
    `
      SELECT
        COUNT(*)::integer AS "userCount",
        COUNT(*) FILTER (WHERE role = 'ADMIN')::integer AS "adminCount"
      FROM users
      WHERE login_id LIKE 'demo\\_%' ESCAPE '\\'
    `,
  );

  log.info("개발 더미데이터를 다시 생성했습니다.", {
    databaseName,
    userCount: rows[0].userCount,
    adminCount: rows[0].adminCount,
    defaultPassword: "Potato123!",
  });
}

try {
  await loadDemoData();
} catch (error) {
  log.error("개발 더미데이터 생성에 실패했습니다.", { error });
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
