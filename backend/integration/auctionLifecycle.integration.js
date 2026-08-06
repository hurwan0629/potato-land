import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  closeDatabase,
  connectDatabase,
  query,
} from "../src/infrastructure/database/database.js";
import { findDashboard } from "../src/modules/admin/admin.repository.js";
import {
  finalizeAuctionRecord,
  findAuctionBids,
  softDeleteAuction,
} from "../src/modules/auctions/auctions.repository.js";
import { resetAndLoadScenarioFixtures } from "../test-support/scenarioFixtures.js";

let fixture;

before(async () => {
  await connectDatabase();
  fixture = await resetAndLoadScenarioFixtures();
});

after(async () => {
  await closeDatabase();
});

test("경매 등록 fixture는 이미지 네 장을 보존한다", async () => {
  const { rows } = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM post_images
      WHERE listing_idx = $1
    `,
    [fixture.auctions.leaderboard],
  );

  assert.equal(rows[0].count, 4);
});

test("입찰 순위는 원본 이력을 보존하면서 사용자별 최고가만 반환한다", async () => {
  const history = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM auction_bids
      WHERE listing_idx = $1
    `,
    [fixture.auctions.leaderboard],
  );
  const leaderboard = await findAuctionBids({
    listingIdx: fixture.auctions.leaderboard,
    page: 1,
    limit: 10,
    offset: 0,
  });

  assert.equal(history.rows[0].count, 3);
  assert.equal(leaderboard.totalCount, 2);
  assert.deepEqual(
    leaderboard.rows.map((row) => Number(row.bidAmount)),
    [15_000, 13_000],
  );
});

test("경매 삭제는 화면 접속 여부와 무관하게 전체 입찰자 알림을 저장한다", async () => {
  const result = await softDeleteAuction(
    fixture.auctions.deletion,
    fixture.users.seller,
    "통합 테스트 삭제",
  );

  assert.equal(result.notifications.length, 2);
  assert.deepEqual(
    result.notifications
      .map((notification) => Number(notification.receiverIdx))
      .sort((a, b) => a - b),
    [fixture.users.bidderA, fixture.users.bidderB].sort((a, b) => a - b),
  );
});


test("관리자 차트 집계는 데이터가 없는 날짜도 0으로 채운다", async () => {
  const dashboard = await findDashboard({
    ...fixture.dashboard,
    interval: "DAY",
  });

  assert.equal(
    dashboard.listingRegistrationCounts
      .reduce((sum, item) => sum + Number(item.count), 0),
    3,
  );
  assert.equal(
    dashboard.completedTransactionCounts
      .reduce((sum, item) => sum + Number(item.count), 0),
    2,
  );
  assert.ok(
    dashboard.listingRegistrationCounts
      .some((item) => Number(item.count) === 0),
  );
});

test("경매 종료는 거래와 판매자-낙찰자 채팅방을 함께 생성한다", async () => {
  const result = await finalizeAuctionRecord(fixture.auctions.finalization);

  assert.equal(Number(result.winner.bidder_idx), fixture.users.bidderB);
  assert.ok(Number(result.transaction.idx) > 0);
  assert.equal(result.chatRoom.buyerIdx, fixture.users.bidderB);
  assert.equal(result.chatRoom.sellerIdx, fixture.users.seller);
  assert.equal(result.chatRoom.created, true);

  const systemMessage = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM chat_messages
      WHERE chat_room_idx = $1
        AND message_type = 'SYSTEM'
    `,
    [result.chatRoom.chatRoomIdx],
  );
  assert.equal(systemMessage.rows[0].count, 1);
});
