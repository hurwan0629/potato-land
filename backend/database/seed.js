import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { logger } from "../src/common/logging/logger.js";
import {
  closeDatabase,
  connectDatabase,
  withTransaction,
} from "../src/infrastructure/database/database.js";

const log = logger.child("db:seed");
const seedsDirectory = fileURLToPath(new URL("./seeds/", import.meta.url));

async function findSeedFiles() {
  const entries = await readdir(seedsDirectory, { withFileTypes: true });

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^\d{3}_.+\.sql$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();
}

async function runSeeds() {
  await connectDatabase();

  const files = await findSeedFiles();

  if (files.length === 0) {
    throw new Error(
      `실행할 Seed SQL 파일이 없습니다: ${seedsDirectory}`,
    );
  }

  for (const filename of files) {
    const sql = await readFile(
      new URL(`./seeds/${filename}`, import.meta.url),
      "utf8",
    );

    await withTransaction((client) => client.query(sql));

    log.info("Seed를 적용했습니다.", { filename });
  }

  log.info("Database seed가 완료되었습니다.", {
    totalCount: files.length,
  });
}

try {
  await runSeeds();
} catch (error) {
  log.error("Database seed에 실패했습니다.", { error });
  process.exitCode = 1;
} finally {
  await closeDatabase();
}