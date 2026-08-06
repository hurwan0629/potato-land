import bcrypt from "bcrypt";

import {
  query,
  withTransaction,
} from "../src/infrastructure/database/database.js";

const TEST_PASSWORD = "Potato123!";

async function assertTestDatabase() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("시나리오 fixture는 NODE_ENV=test에서만 실행할 수 있습니다.");
  }

  const { rows } = await query(
    "SELECT CURRENT_DATABASE() AS database_name",
  );
  const databaseName = String(rows[0].database_name ?? "");

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `테스트 전용 DB만 초기화할 수 있습니다: ${databaseName || "unknown"}`,
    );
  }

  return databaseName;
}

async function resetScenarioTables(client) {
  await client.query(`
    TRUNCATE TABLE
      reviews,
      chat_messages,
      chat_rooms,
      notifications,
      transactions,
      auction_bids,
      auction_posts,
      used_posts,
      post_images,
      favorites,
      listings,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function insertUser(client, user, passwordHash) {
  const { rows } = await client.query(
    `
      INSERT INTO users (
        login_id,
        password_hash,
        name,
        nickname,
        phone,
        email,
        role,
        banned_at,
        deleted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING idx
    `,
    [
      user.loginId,
      passwordHash,
      user.name,
      user.nickname,
      user.phone,
      user.email,
      user.role ?? "USER",
      user.bannedAt ?? null,
      user.deletedAt ?? null,
    ],
  );

  return Number(rows[0].idx);
}

async function insertAuction(
  client,
  {
    sellerIdx,
    categoryIdx,
    title,
    startPrice,
    endsAt,
    imageCount = 1,
  },
) {
  const listingResult = await client.query(
    `
      INSERT INTO listings (
        seller_idx,
        category_idx,
        listing_type,
        title,
        description,
        preferred_trade_location,
        product_status
      )
      VALUES ($1, $2, 'AUCTION', $3, $4, $5, 'LIKE_NEW')
      RETURNING idx
    `,
    [
      sellerIdx,
      categoryIdx,
      title,
      `${title} 통합 테스트 설명`,
      "테스트역 1번 출구",
    ],
  );
  const listingIdx = Number(listingResult.rows[0].idx);

  await client.query(
    `
      INSERT INTO auction_posts (
        listing_idx,
        start_price,
        current_price,
        bid_unit,
        started_at,
        ends_at,
        status
      )
      VALUES ($1, $2, $2, 1000, NOW(), $3, 'ON_GOING')
    `,
    [listingIdx, startPrice, endsAt],
  );

  for (let sortOrder = 0; sortOrder < imageCount; sortOrder += 1) {
    await client.query(
      `
        INSERT INTO post_images (listing_idx, image_url, sort_order)
        VALUES ($1, $2, $3)
      `,
      [listingIdx, `/resources/test/auction-${listingIdx}-${sortOrder}.webp`, sortOrder],
    );
  }

  return listingIdx;
}

/**
 * 관리자·판매자·복수 입찰자가 포함된 반복 가능한 통합 테스트 데이터를 만든다.
 */
export async function resetAndLoadScenarioFixtures() {
  const databaseName = await assertTestDatabase();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);

  return withTransaction(async (client) => {
    await resetScenarioTables(client);

    const categoryResult = await client.query(
      `
        SELECT idx
        FROM categories
        WHERE is_active = TRUE
        ORDER BY sort_order, idx
        LIMIT 1
      `,
    );

    if (!categoryResult.rows[0]) {
      throw new Error("카테고리 seed를 먼저 적용해주세요.");
    }
    const categoryIdx = Number(categoryResult.rows[0].idx);

    const definitions = {
      admin: {
        loginId: "test_admin",
        name: "테스트 관리자",
        nickname: "관리감자",
        phone: "01090000001",
        email: "admin@test.local",
        role: "ADMIN",
      },
      seller: {
        loginId: "test_seller",
        name: "테스트 판매자",
        nickname: "판매감자",
        phone: "01090000002",
        email: "seller@test.local",
      },
      bidderA: {
        loginId: "test_bidder_a",
        name: "테스트 입찰자A",
        nickname: "입찰감자A",
        phone: "01090000003",
        email: "bidder-a@test.local",
      },
      bidderB: {
        loginId: "test_bidder_b",
        name: "테스트 입찰자B",
        nickname: "입찰감자B",
        phone: "01090000004",
        email: "bidder-b@test.local",
      },
      buyer: {
        loginId: "test_buyer",
        name: "테스트 구매자",
        nickname: "구매감자",
        phone: "01090000005",
        email: "buyer@test.local",
      },
      spectator: {
        loginId: "test_spectator",
        name: "테스트 관전자",
        nickname: "구경감자",
        phone: "01090000006",
        email: "spectator@test.local",
      },
      banned: {
        loginId: "test_banned",
        name: "테스트 정지회원",
        nickname: "정지감자",
        phone: "01090000007",
        email: "banned@test.local",
        bannedAt: new Date(),
      },
      withdrawn: {
        loginId: "test_withdrawn",
        name: "테스트 탈퇴회원",
        nickname: "탈퇴감자",
        phone: "01090000008",
        email: "withdrawn@test.local",
        deletedAt: new Date(),
      },
    };

    const users = {};
    for (const [name, definition] of Object.entries(definitions)) {
      users[name] = await insertUser(client, definition, passwordHash);
    }

    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const auctions = {
      leaderboard: await insertAuction(client, {
        sellerIdx: users.seller,
        categoryIdx,
        title: "입찰 순위 테스트 경매",
        startPrice: 10_000,
        endsAt: future,
        imageCount: 4,
      }),
      deletion: await insertAuction(client, {
        sellerIdx: users.seller,
        categoryIdx,
        title: "삭제 알림 테스트 경매",
        startPrice: 20_000,
        endsAt: future,
        imageCount: 2,
      }),
      finalization: await insertAuction(client, {
        sellerIdx: users.seller,
        categoryIdx,
        title: "낙찰 채팅 테스트 경매",
        startPrice: 30_000,
        endsAt: new Date(Date.now() - 1_000),
        imageCount: 3,
      }),
    };

    const bids = [
      [auctions.leaderboard, users.bidderA, 11_000],
      [auctions.leaderboard, users.bidderA, 13_000],
      [auctions.leaderboard, users.bidderB, 15_000],
      [auctions.deletion, users.bidderA, 21_000],
      [auctions.deletion, users.bidderB, 23_000],
      [auctions.finalization, users.bidderA, 31_000],
      [auctions.finalization, users.bidderB, 35_000],
    ];

    for (const [listingIdx, bidderIdx, bidPrice] of bids) {
      await client.query(
        `
          INSERT INTO auction_bids (listing_idx, bidder_idx, bid_price)
          VALUES ($1, $2, $3)
        `,
        [listingIdx, bidderIdx, bidPrice],
      );
      await client.query(
        `
          UPDATE auction_posts
          SET current_price = GREATEST(current_price, $2)
          WHERE listing_idx = $1
        `,
        [listingIdx, bidPrice],
      );
    }

    // 관리자 차트가 빈 날짜를 포함해 그려지는지 확인할 수 있도록 날짜를 분산한다.
    const dashboardTo = new Date(Date.now() + 60 * 60 * 1000);
    const dashboardFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const listingDates = [
      [auctions.leaderboard, new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)],
      [auctions.deletion, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)],
      [auctions.finalization, new Date(Date.now() - 24 * 60 * 60 * 1000)],
    ];

    for (const [listingIdx, createdAt] of listingDates) {
      await client.query(
        "UPDATE listings SET created_at = $2 WHERE idx = $1",
        [listingIdx, createdAt],
      );
    }

    await client.query(
      `
        INSERT INTO transactions (
          listing_idx,
          seller_idx,
          buyer_idx,
          transaction_type,
          status,
          amount,
          completed_at
        )
        VALUES
          ($1, $3, $4, 'AUCTION', 'COMPLETED', 15000, $6),
          ($2, $3, $5, 'AUCTION', 'COMPLETED', 23000, $7)
      `,
      [
        auctions.leaderboard,
        auctions.deletion,
        users.seller,
        users.bidderB,
        users.bidderA,
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      ],
    );

    return {
      databaseName,
      password: TEST_PASSWORD,
      categoryIdx,
      users,
      auctions,
      dashboard: {
        from: dashboardFrom,
        to: dashboardTo,
      },
    };
  });
}
