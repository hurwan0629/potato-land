import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { logger } from "../src/common/logging/logger.js";
import {
  closeDatabase,
  connectDatabase,
} from "../src/infrastructure/database/database.js";
import { resetAndLoadScenarioFixtures } from "./scenarioFixtures.js";

const log = logger.child("test-fixtures");

try {
  await connectDatabase();
  const fixture = await resetAndLoadScenarioFixtures();
  log.info("통합 테스트 fixture를 준비했습니다.", {
    databaseName: fixture.databaseName,
    userCount: Object.keys(fixture.users).length,
    auctionCount: Object.keys(fixture.auctions).length,
  });
  const serialized = JSON.stringify(fixture, null, 2);
  const outputPath = process.env.TEST_FIXTURE_OUTPUT;

  if (outputPath) {
    const resolvedOutputPath = resolve(outputPath);
    await writeFile(resolvedOutputPath, `${serialized}\n`, "utf8");
    log.info("통합 테스트 fixture 정보를 파일로 저장했습니다.", {
      outputPath: resolvedOutputPath,
    });
  }

  console.log(serialized);
} catch (error) {
  log.error("통합 테스트 fixture 준비에 실패했습니다.", { error });
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
