import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { logger } from "../src/common/logging/logger.js";
import {
  closeDatabase,
  connectDatabase,
  query,
  withTransaction,
} from "../src/infrastructure/database/database.js";

const log = logger.child("db:migrate");
const migrationsDirectory = fileURLToPath(
  new URL("./migrations/", import.meta.url),
);

function checksum(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

async function findMigrationFiles() {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /^\d{3}_.+\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function ensureMigrationTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function runMigrations() {
  await connectDatabase();
  await ensureMigrationTable();

  const files = await findMigrationFiles();
  const { rows } = await query(
    "SELECT filename, checksum FROM schema_migrations ORDER BY filename",
  );
  const applied = new Map(rows.map((row) => [row.filename, row.checksum]));
  let appliedCount = 0;

  for (const filename of files) {
    const sql = await readFile(
      new URL(`./migrations/${filename}`, import.meta.url),
      "utf8",
    );
    const currentChecksum = checksum(sql);
    const appliedChecksum = applied.get(filename);

    if (appliedChecksum) {
      if (appliedChecksum !== currentChecksum) {
        throw new Error(`적용된 migration 파일이 변경되었습니다: ${filename}`);
      }
      continue;
    }

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query(
        `
          INSERT INTO schema_migrations (filename, checksum)
          VALUES ($1, $2)
        `,
        [filename, currentChecksum],
      );
    });

    appliedCount += 1;
    log.info("Migration을 적용했습니다.", { filename });
  }

  log.info("Database migration이 완료되었습니다.", {
    appliedCount,
    totalCount: files.length,
  });
}

try {
  await runMigrations();
} catch (error) {
  log.error("Database migration에 실패했습니다.", { error });
  process.exitCode = 1;
} finally {
  await closeDatabase();
}