import {
  query,
  withTransaction,
} from "../../infrastructure/database/database.js";

/** 관리자 대시보드의 요약 수치와 기간별 집계를 조회한다. */
export async function findDashboard({ from, to, interval }) {
  const unit = interval === "HOUR" ? "hour" : "day";

  const [
    users,
    listings,
    transactions,
    listingSeries,
    transactionSeries,
  ] = await Promise.all([
    query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE deleted_at IS NULL
        AND banned_at IS NULL
    `),
    query(`
      SELECT COUNT(*)::int AS count
      FROM listings
      WHERE deleted_at IS NULL
    `),
    query(`
      SELECT
        COUNT(*)::int AS count,
        COALESCE(SUM(amount), 0)::bigint AS amount
      FROM transactions
      WHERE status = 'COMPLETED'
    `),
    query(
      `
        SELECT
          date_trunc($1, created_at) AS period,
          COUNT(*)::int AS count
        FROM listings
        WHERE created_at >= $2
          AND created_at < $3
        GROUP BY period
        ORDER BY period
      `,
      [unit, from, to],
    ),
    query(
      `
        SELECT
          date_trunc($1, completed_at) AS period,
          COUNT(*)::int AS count
        FROM transactions
        WHERE status = 'COMPLETED'
          AND completed_at >= $2
          AND completed_at < $3
        GROUP BY period
        ORDER BY period
      `,
      [unit, from, to],
    ),
  ]);

  return {
    activeUserCount: users.rows[0].count,
    totalListingCount: listings.rows[0].count,
    completedTransactionCount: transactions.rows[0].count,
    totalCompletedAmount: Number(transactions.rows[0].amount),
    listingRegistrationCounts: listingSeries.rows,
    completedTransactionCounts: transactionSeries.rows,
  };
}

/** 검색어와 상태 필터에 맞는 관리자 회원 목록을 조회한다. */
export async function findUsers({ q, status, limit, offset }) {
  const search = q ? `%${q}%` : null;
  const where = `
    (
      $1::text IS NULL
      OR user_account.login_id ILIKE $1
      OR user_account.nickname ILIKE $1
      OR user_account.name ILIKE $1
      OR user_account.email ILIKE $1
      OR user_account.idx::text = $2
    )
    AND (
      $3 = 'ALL'
      OR (
        $3 = 'ACTIVE'
        AND user_account.deleted_at IS NULL
        AND user_account.banned_at IS NULL
      )
      OR (
        $3 = 'BANNED'
        AND user_account.deleted_at IS NULL
        AND user_account.banned_at IS NOT NULL
      )
      OR (
        $3 = 'WITHDRAWN'
        AND user_account.deleted_at IS NOT NULL
      )
    )
  `;
  const values = [search, q || null, status, limit, offset];

  const [items, count] = await Promise.all([
    query(
      `
        SELECT
          user_account.idx AS "userIdx",
          user_account.login_id AS "loginId",
          user_account.name,
          user_account.nickname,
          user_account.profile_image AS "profileImageUrl",
          user_account.phone,
          user_account.email,
          CASE
            WHEN user_account.deleted_at IS NOT NULL THEN 'WITHDRAWN'
            WHEN user_account.banned_at IS NOT NULL THEN 'BANNED'
            ELSE 'ACTIVE'
          END AS status,
          (
            SELECT COUNT(*)
            FROM transactions tx
            WHERE (
              tx.seller_idx = user_account.idx
              OR tx.buyer_idx = user_account.idx
            )
              AND tx.status = 'COMPLETED'
          )::int AS "tradeCount",
          user_account.created_at AS "createdAt"
        FROM users user_account
        WHERE ${where}
        ORDER BY user_account.created_at DESC
        LIMIT $4 OFFSET $5
      `,
      values,
    ),
    query(
      `
        SELECT COUNT(*)::int AS count
        FROM users user_account
        WHERE ${where}
      `,
      values.slice(0, 3),
    ),
  ]);

  return {
    rows: items.rows,
    totalCount: count.rows[0].count,
  };
}

/** 관리자 회원 상세 화면에 필요한 활동 요약을 조회한다. */
export async function findAdminUserDetail(userIdx) {
  const result = await query(
    `
      SELECT
        user_account.idx AS "userIdx",
        user_account.login_id AS "loginId",
        user_account.name,
        user_account.nickname,
        user_account.phone,
        user_account.email,
        user_account.profile_image AS "profileImageUrl",
        user_account.bio,
        user_account.role,
        user_account.admin_memo AS "adminMemo",
        user_account.banned_at AS "bannedAt",
        user_account.ban_reason AS "banReason",
        user_account.deleted_at AS "deletedAt",
        user_account.created_at AS "createdAt",
        (
          SELECT COUNT(*)
          FROM transactions tx
          WHERE (
            tx.seller_idx = user_account.idx
            OR tx.buyer_idx = user_account.idx
          )
            AND tx.status = 'COMPLETED'
        )::int AS "tradeCount",
        (
          SELECT COUNT(*)
          FROM listings listing
          WHERE listing.seller_idx = user_account.idx
        )::int AS "listingCount",
        (
          SELECT COUNT(*)
          FROM reviews review
          WHERE review.reviewee_idx = user_account.idx
        )::int AS "receivedReviewCount",
        COALESCE(
          (
            SELECT AVG(review.rating)
            FROM reviews review
            WHERE review.reviewee_idx = user_account.idx
          ),
          0
        ) AS "averageRating"
      FROM users user_account
      WHERE user_account.idx = $1
    `,
    [userIdx],
  );

  return result.rows[0] ?? null;
}

/** 관리자 내부 메모를 갱신한다. */
export async function updateAdminMemo(userIdx, memo) {
  const result = await query(
    `
      UPDATE users
      SET
        admin_memo = $2,
        updated_at = NOW()
      WHERE idx = $1
      RETURNING
        idx,
        admin_memo,
        updated_at
    `,
    [userIdx, memo],
  );

  return result.rows[0] ?? null;
}

/** 중고 또는 경매 게시글의 관리자 목록을 조회한다. */
export async function findAdminListings({
  listingType,
  q,
  limit,
  offset,
}) {
  const search = q ? `%${q}%` : null;
  const values = [listingType, search, q || null, limit, offset];
  const where = `
    listing.listing_type = $1::listing_type
    AND (
      $2::text IS NULL
      OR listing.title ILIKE $2
      OR seller.login_id ILIKE $2
      OR listing.idx::text = $3
    )
  `;

  const [items, count] = await Promise.all([
    query(
      `
        SELECT
          listing.idx AS "listingIdx",
          listing.listing_type AS "listingType",
          listing.title,
          listing.deleted_at AS "deletedAt",
          seller.idx AS "sellerIdx",
          seller.login_id AS "sellerLoginId",
          seller.nickname AS "sellerNickname",
          thumbnail.image_url AS "thumbnailUrl",
          listing.created_at AS "createdAt",
          used_post.price,
          used_post.trade_status AS "tradeStatus",
          auction_post.current_price AS "currentPrice",
          auction_post.status AS "auctionStatus",
          auction_post.ends_at AS "endsAt",
          winner.bidder_idx AS "winnerIdx",
          winner.nickname AS "winnerNickname"
        FROM listings listing
        JOIN users seller ON seller.idx = listing.seller_idx
        LEFT JOIN used_posts used_post
          ON used_post.listing_idx = listing.idx
        LEFT JOIN auction_posts auction_post
          ON auction_post.listing_idx = listing.idx
        LEFT JOIN post_images thumbnail
          ON thumbnail.listing_idx = listing.idx
         AND thumbnail.sort_order = 0
        LEFT JOIN LATERAL (
          SELECT
            bid.bidder_idx,
            user_account.nickname
          FROM auction_bids bid
          JOIN users user_account ON user_account.idx = bid.bidder_idx
          WHERE bid.idx = auction_post.winning_bid_idx
        ) winner ON TRUE
        WHERE ${where}
        ORDER BY listing.created_at DESC
        LIMIT $4 OFFSET $5
      `,
      values,
    ),
    query(
      `
        SELECT COUNT(*)::int AS count
        FROM listings listing
        JOIN users seller ON seller.idx = listing.seller_idx
        WHERE ${where}
      `,
      values.slice(0, 3),
    ),
  ]);

  return {
    rows: items.rows,
    totalCount: count.rows[0].count,
  };
}

/** 종료된 경매의 낙찰자 목록을 조회한다. */
export async function findAuctionWinners({ limit, offset }) {
  const [items, count] = await Promise.all([
    query(
      `
        SELECT
          listing.idx AS "listingIdx",
          listing.title,
          listing.seller_idx AS "sellerIdx",
          seller.nickname AS "sellerNickname",
          winning_bid.bidder_idx AS "winnerIdx",
          winner.nickname AS "winnerNickname",
          winning_bid.bid_price AS "winningPrice",
          auction_post.ends_at AS "endedAt"
        FROM auction_posts auction_post
        JOIN listings listing
          ON listing.idx = auction_post.listing_idx
        JOIN users seller ON seller.idx = listing.seller_idx
        JOIN auction_bids winning_bid
          ON winning_bid.idx = auction_post.winning_bid_idx
        JOIN users winner ON winner.idx = winning_bid.bidder_idx
        WHERE auction_post.status = 'FINISHED'
        ORDER BY auction_post.ends_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    ),
    query(`
      SELECT COUNT(*)::int AS count
      FROM auction_posts
      WHERE status = 'FINISHED'
        AND winning_bid_idx IS NOT NULL
    `),
  ]);

  return {
    rows: items.rows,
    totalCount: count.rows[0].count,
  };
}

/** 지정 회원이 참여한 거래 목록을 조회한다. */
export async function findUserTransactions(
  userIdx,
  { limit, offset },
) {
  const [items, count] = await Promise.all([
    query(
      `
        SELECT
          tx.idx AS "transactionIdx",
          tx.listing_idx AS "listingIdx",
          listing.title,
          listing.listing_type AS "listingType",
          CASE
            WHEN tx.seller_idx = $1 THEN 'SELL'
            ELSE 'BUY'
          END AS "tradeRole",
          tx.amount,
          tx.status,
          tx.created_at AS "createdAt",
          tx.completed_at AS "completedAt"
        FROM transactions tx
        JOIN listings listing ON listing.idx = tx.listing_idx
        WHERE tx.seller_idx = $1
           OR tx.buyer_idx = $1
        ORDER BY tx.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userIdx, limit, offset],
    ),
    query(
      `
        SELECT COUNT(*)::int AS count
        FROM transactions
        WHERE seller_idx = $1
           OR buyer_idx = $1
      `,
      [userIdx],
    ),
  ]);

  return {
    rows: items.rows,
    totalCount: count.rows[0].count,
  };
}

/** 지정 회원이 작성하거나 받은 후기 목록을 조회한다. */
export async function findUserReviewActivity(
  userIdx,
  { limit, offset },
) {
  const [items, count] = await Promise.all([
    query(
      `
        SELECT
          review.idx AS "reviewIdx",
          review.transaction_idx AS "transactionIdx",
          review.reviewer_idx AS "reviewerIdx",
          reviewer.nickname AS "reviewerNickname",
          review.reviewee_idx AS "revieweeIdx",
          reviewee.nickname AS "revieweeNickname",
          review.rating,
          review.content,
          review.created_at AS "createdAt"
        FROM reviews review
        JOIN users reviewer ON reviewer.idx = review.reviewer_idx
        JOIN users reviewee ON reviewee.idx = review.reviewee_idx
        WHERE review.reviewer_idx = $1
           OR review.reviewee_idx = $1
        ORDER BY review.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userIdx, limit, offset],
    ),
    query(
      `
        SELECT COUNT(*)::int AS count
        FROM reviews
        WHERE reviewer_idx = $1
           OR reviewee_idx = $1
      `,
      [userIdx],
    ),
  ]);

  return {
    rows: items.rows,
    totalCount: count.rows[0].count,
  };
}

/**
 * 사용자 영구정지와 진행 중 거래·상품·입찰 상태 정리를 같은 transaction에서 수행한다.
 */
export async function banUserCascade(userIdx, reason) {
  return withTransaction(async (client) => {
    const targetResult = await client.query(
      `
        SELECT idx, banned_at, deleted_at
        FROM users
        WHERE idx = $1
        FOR UPDATE
      `,
      [userIdx],
    );
    const target = targetResult.rows[0];

    if (!target) {
      return { failure: "NOT_FOUND" };
    }
    if (target.deleted_at) {
      return { failure: "WITHDRAWN" };
    }
    if (target.banned_at) {
      return { failure: "ALREADY_BANNED" };
    }

    // 1. 진행 중 거래를 취소하고 상대방에게 알림을 저장한다.
    const canceled = await client.query(
      `
        UPDATE transactions
        SET
          status = 'CANCELED',
          canceled_by = $1,
          updated_at = NOW()
        WHERE (seller_idx = $1 OR buyer_idx = $1)
          AND status = 'REQUESTED'
        RETURNING idx, seller_idx, buyer_idx
      `,
      [userIdx],
    );

    for (const transaction of canceled.rows) {
      const receiverIdx =
        Number(tx.seller_idx) === Number(userIdx)
          ? tx.buyer_idx
          : tx.seller_idx;

      await client.query(
        `
          INSERT INTO notifications (
            receiver_idx,
            notification_type,
            reference_type,
            reference_idx,
            content
          )
          VALUES (
            $1,
            'PAYMENT_CANCELED',
            'TRANSACTION',
            $2,
            '거래 상대방의 계정 정지로 거래가 취소되었습니다.'
          )
        `,
        [receiverIdx, transaction.idx],
      );
    }

    // 2. 회원 소유 게시글을 삭제하고 관심 등록을 정리한다.
    const ownedAuctions = await client.query(
      `
        SELECT auction_post.listing_idx
        FROM auction_posts auction_post
        JOIN listings listing ON listing.idx = auction_post.listing_idx
        WHERE listing.seller_idx = $1
          AND listing.deleted_at IS NULL
          AND auction_post.status = 'ON_GOING'
      `,
      [userIdx],
    );

    const deleted = await client.query(
      `
        UPDATE listings
        SET
          deleted_at = NOW(),
          deleted_by = $1,
          delete_reason = '회원 영구정지로 인한 자동 삭제',
          updated_at = NOW()
        WHERE seller_idx = $1
          AND deleted_at IS NULL
        RETURNING idx
      `,
      [userIdx],
    );
    const deletedIds = deleted.rows.map((row) => row.idx);

    if (deletedIds.length > 0) {
      await client.query(
        "DELETE FROM favorites WHERE listing_idx = ANY($1::bigint[])",
        [deletedIds],
      );
    }

    // 3. 정지 회원의 진행 중 입찰을 제거하고 각 경매의 현재가를 재계산한다.
    const affected = await client.query(
      `
        SELECT DISTINCT
          auction_post.listing_idx,
          auction_post.start_price
        FROM auction_posts auction_post
        JOIN auction_bids bid
          ON bid.listing_idx = auction_post.listing_idx
        JOIN listings listing
          ON listing.idx = auction_post.listing_idx
        WHERE bid.bidder_idx = $1
          AND auction_post.status = 'ON_GOING'
          AND listing.deleted_at IS NULL
      `,
      [userIdx],
    );

    await client.query(
      `
        DELETE FROM auction_bids bid
        USING auction_posts auction_post
        WHERE bid.listing_idx = auction_post.listing_idx
          AND bid.bidder_idx = $1
          AND auction_post.status = 'ON_GOING'
      `,
      [userIdx],
    );

    for (const auction of affected.rows) {
      const nextBid = await client.query(
        `
          SELECT bid_price
          FROM auction_bids
          WHERE listing_idx = $1
          ORDER BY bid_price DESC, created_at ASC
          LIMIT 1
        `,
        [auction.listing_idx],
      );

      await client.query(
        `
          UPDATE auction_posts
          SET
            current_price = $2,
            winning_bid_idx = NULL
          WHERE listing_idx = $1
        `,
        [
          auction.listing_idx,
          nextBid.rows[0]?.bid_price ?? auction.start_price,
        ],
      );
    }

    // 4. 연쇄 정리가 성공한 뒤 회원을 영구정지 상태로 변경한다.
    const banned = await client.query(
      `
        UPDATE users
        SET
          banned_at = NOW(),
          ban_reason = $2,
          updated_at = NOW()
        WHERE idx = $1
        RETURNING banned_at
      `,
      [userIdx, reason],
    );

    return {
      bannedAt: banned.rows[0].banned_at,
      ownedAuctionIdxs: ownedAuctions.rows.map((row) =>
        Number(row.listing_idx)),
      affectedAuctionIdxs: affected.rows.map((row) =>
        Number(row.listing_idx)),
      canceledTransactionCount: canceled.rowCount,
      deletedListingCount: deleted.rowCount,
    };
  });
}
