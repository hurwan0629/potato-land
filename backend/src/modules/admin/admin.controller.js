import { query, withTransaction } from "../../infrastructure/database/database.js";
import { AppError } from "../../common/errors/AppError.js";

// =====================================================
// 공통 헬퍼
// =====================================================

// 관리자 인증/권한 확인. auth 미들웨어가 아직 없어서 req.user는 나중에
// 채워진다고 가정한다 (mypage 모듈과 동일한 전제).
function requireAdmin(req) {
  if (!req.user) {
    return new AppError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    });
  }

  if (req.user.role !== "ADMIN") {
    return new AppError({
      status: 403,
      code: "FORBIDDEN",
      message: "관리자 권한이 필요합니다.",
    });
  }

  return null;
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function toPage(reqQuery) {
  return Math.max(toPositiveInt(reqQuery.page, 1), 1);
}

function toLimit(reqQuery, fallback) {
  return Math.min(Math.max(toPositiveInt(reqQuery.limit, fallback), 1), 100);
}

function truncateDate(date, interval) {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  if (interval === "DAY") d.setUTCHours(0);
  return d;
}

function addOnePeriod(date, interval) {
  const d = new Date(date);
  if (interval === "HOUR") d.setUTCHours(d.getUTCHours() + 1);
  else d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function buildPeriods(from, to, interval) {
  const stepMs = interval === "HOUR" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const periods = [];

  for (let t = from.getTime(); t <= to.getTime(); t += stepMs) {
    periods.push(new Date(t));
  }

  return periods;
}

function formatPeriod(date, interval) {
  return interval === "HOUR" ? date.toISOString() : date.toISOString().slice(0, 10);
}

// =====================================================
// 대시보드
// =====================================================

export async function getDashboard(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { from, to, interval = "DAY" } = req.query;

  if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return next(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "from/to 날짜 형식이 올바르지 않습니다.",
        details: { from, to },
      }),
    );
  }

  if (!["HOUR", "DAY"].includes(interval)) {
    return next(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "interval은 HOUR 또는 DAY만 허용합니다.",
        details: { interval },
      }),
    );
  }

  const periodStart = truncateDate(from, interval);
  const periodEndInclusive = truncateDate(to, interval);

  if (periodStart > periodEndInclusive) {
    return next(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "from은 to보다 이후일 수 없습니다.",
        details: { from, to },
      }),
    );
  }

  const periodEndExclusive = addOnePeriod(periodEndInclusive, interval);
  const truncUnit = interval === "HOUR" ? "hour" : "day";

  try {
    const [
      activeUserCountResult,
      totalListingCountResult,
      completedTxResult,
      listingBucketsResult,
      txBucketsResult,
    ] = await Promise.all([
      query(
        `SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL AND banned_at IS NULL`,
      ),
      query(`SELECT COUNT(*) AS count FROM listings WHERE deleted_at IS NULL`),
      query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_amount
         FROM transactions
         WHERE status = 'COMPLETED'`,
      ),
      query(
        `SELECT date_trunc($1, created_at) AS period, COUNT(*) AS count
         FROM listings
         WHERE created_at >= $2 AND created_at < $3
         GROUP BY period`,
        [truncUnit, periodStart, periodEndExclusive],
      ),
      query(
        `SELECT date_trunc($1, completed_at) AS period, COUNT(*) AS count
         FROM transactions
         WHERE status = 'COMPLETED' AND completed_at >= $2 AND completed_at < $3
         GROUP BY period`,
        [truncUnit, periodStart, periodEndExclusive],
      ),
    ]);

    const listingBucketMap = new Map(
      listingBucketsResult.rows.map((row) => [row.period.toISOString(), Number(row.count)]),
    );
    const txBucketMap = new Map(
      txBucketsResult.rows.map((row) => [row.period.toISOString(), Number(row.count)]),
    );

    const periods = buildPeriods(periodStart, periodEndInclusive, interval);

    return res.status(200).json({
      success: true,
      data: {
        activeUserCount: Number(activeUserCountResult.rows[0].count),
        totalListingCount: Number(totalListingCountResult.rows[0].count),
        completedTransactionCount: Number(completedTxResult.rows[0].count),
        totalCompletedAmount: Number(completedTxResult.rows[0].total_amount),
        listingRegistrationCounts: periods.map((period) => ({
          period: formatPeriod(period, interval),
          count: listingBucketMap.get(period.toISOString()) ?? 0,
        })),
        completedTransactionCounts: periods.map((period) => ({
          period: formatPeriod(period, interval),
          count: txBucketMap.get(period.toISOString()) ?? 0,
        })),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "GET_DASHBOARD_FAILED",
        message: "관리자 대시보드를 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    );
  }
}

// =====================================================
// 회원 관리
// =====================================================

export async function listUsers(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { q, status = "ALL" } = req.query;
  const page = toPage(req.query);
  const limit = toLimit(req.query, 11);
  const offset = (page - 1) * limit;

  const allowedStatus = ["ALL", "ACTIVE", "BANNED", "WITHDRAWN"];
  if (!allowedStatus.includes(status)) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_STATUS",
        message: "유효하지 않은 회원 상태입니다.",
        details: { status },
      }),
    );
  }

  const qLike = q ? `%${q}%` : null;

  try {
    const result = await query(
      `
      SELECT
        u.idx AS "userIdx",
        u.login_id AS "loginId",
        u.name AS "name",
        u.nickname AS "nickname",
        u.profile_image AS "profileImageUrl",
        u.phone AS "phone",
        u.email AS "email",
        CASE
          WHEN u.deleted_at IS NOT NULL THEN 'WITHDRAWN'
          WHEN u.banned_at IS NOT NULL THEN 'BANNED'
          ELSE 'ACTIVE'
        END AS "status",
        (
          SELECT COUNT(*) FROM transactions t
          WHERE (t.seller_idx = u.idx OR t.buyer_idx = u.idx) AND t.status = 'COMPLETED'
        ) AS "tradeCount",
        u.created_at AS "createdAt"
      FROM users u
      WHERE
        (
          $1::TEXT IS NULL
          OR u.login_id ILIKE $1
          OR u.nickname ILIKE $1
          OR u.name ILIKE $1
          OR u.email ILIKE $1
          OR u.idx::TEXT = $2
        )
        AND (
          $3 = 'ALL'
          OR ($3 = 'ACTIVE' AND u.deleted_at IS NULL AND u.banned_at IS NULL)
          OR ($3 = 'BANNED' AND u.deleted_at IS NULL AND u.banned_at IS NOT NULL)
          OR ($3 = 'WITHDRAWN' AND u.deleted_at IS NOT NULL)
        )
      ORDER BY u.created_at DESC
      LIMIT $4
      OFFSET $5
      `,
      [qLike, q ?? null, status, limit, offset],
    );

    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count
      FROM users u
      WHERE
        (
          $1::TEXT IS NULL
          OR u.login_id ILIKE $1
          OR u.nickname ILIKE $1
          OR u.name ILIKE $1
          OR u.email ILIKE $1
          OR u.idx::TEXT = $2
        )
        AND (
          $3 = 'ALL'
          OR ($3 = 'ACTIVE' AND u.deleted_at IS NULL AND u.banned_at IS NULL)
          OR ($3 = 'BANNED' AND u.deleted_at IS NULL AND u.banned_at IS NOT NULL)
          OR ($3 = 'WITHDRAWN' AND u.deleted_at IS NOT NULL)
        )
      `,
      [qLike, q ?? null, status],
    );

    const totalCount = Number(countResult.rows[0].total_count);

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_ADMIN_USERS_FAILED",
        message: "회원 목록을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    );
  }
}

export async function getUser(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { userIdx } = req.params;
  const targetIdx = Number(userIdx);

  if (!Number.isInteger(targetIdx) || targetIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_USER_IDX",
        message: "유효하지 않은 사용자 ID입니다.",
        details: { userIdx },
      }),
    );
  }

  try {
    const userResult = await query(
      `
      SELECT
        idx AS "userIdx",
        login_id AS "loginId",
        name AS "name",
        nickname AS "nickname",
        phone AS "phone",
        email AS "email",
        created_at AS "createdAt",
        banned_at AS "bannedAt",
        banned_until AS "bannedUntil",
        deleted_at AS "deletedAt",
        admin_memo AS "adminMemo",
        CASE
          WHEN deleted_at IS NOT NULL THEN 'WITHDRAWN'
          WHEN banned_at IS NOT NULL THEN 'BANNED'
          ELSE 'ACTIVE'
        END AS "status"
      FROM users
      WHERE idx = $1
      `,
      [targetIdx],
    );

    if (userResult.rows.length === 0) {
      return next(
        new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "회원을 찾을 수 없습니다.",
          details: { userIdx },
        }),
      );
    }

    const row = userResult.rows[0];

    const [tradeSummaryResult, reviewSummaryResult, recentTransactionsResult, recentReviewsResult] =
      await Promise.all([
        query(
          `
          SELECT
            (SELECT COUNT(*) FROM transactions WHERE seller_idx = $1 AND status = 'COMPLETED') AS "sellCount",
            (SELECT COUNT(*) FROM transactions WHERE buyer_idx = $1 AND status = 'COMPLETED') AS "buyCount",
            (SELECT COUNT(*) FROM auction_bids WHERE bidder_idx = $1) AS "auctionBidCount"
          `,
          [targetIdx],
        ),
        query(
          `
          SELECT
            COUNT(*) AS "reviewCount",
            COALESCE(AVG(rating), 0) AS "averageRating"
          FROM reviews
          WHERE reviewee_idx = $1
          `,
          [targetIdx],
        ),
        query(
          `
          SELECT
            t.idx AS "transactionIdx",
            t.listing_idx AS "listingIdx",
            pi.image_url AS "thumbnailUrl",
            l.title AS "title",
            l.listing_type AS "listingType",
            CASE WHEN t.seller_idx = $1 THEN 'SELL' ELSE 'BUY' END AS "tradeRole",
            t.amount AS "amount",
            t.status::TEXT AS "status",
            t.completed_at AS "completedAt"
          FROM transactions t
          INNER JOIN listings l ON l.idx = t.listing_idx
          LEFT JOIN post_images pi ON pi.listing_idx = l.idx AND pi.sort_order = 0
          WHERE t.seller_idx = $1 OR t.buyer_idx = $1
          ORDER BY COALESCE(t.completed_at, t.created_at) DESC
          LIMIT 5
          `,
          [targetIdx],
        ),
        query(
          `
          SELECT
            r.idx AS "reviewIdx",
            r.reviewer_idx AS "reviewerIdx",
            u.nickname AS "reviewerNickname",
            r.reviewee_idx AS "revieweeIdx",
            r.rating AS "rating",
            r.content AS "content",
            l.title AS "listingTitle",
            CASE
              WHEN t.buyer_idx = r.reviewer_idx THEN 'BUYER_REVIEW'
              WHEN t.seller_idx = r.reviewer_idx THEN 'SELLER_REVIEW'
            END AS "reviewType",
            r.created_at AS "createdAt"
          FROM reviews r
          INNER JOIN transactions t ON t.idx = r.transaction_idx
          INNER JOIN listings l ON l.idx = t.listing_idx
          INNER JOIN users u ON u.idx = r.reviewer_idx
          WHERE r.reviewee_idx = $1
          ORDER BY r.created_at DESC
          LIMIT 5
          `,
          [targetIdx],
        ),
      ]);

    const tradeSummary = tradeSummaryResult.rows[0];
    const reviewSummary = reviewSummaryResult.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        user: {
          userIdx: row.userIdx,
          loginId: row.loginId,
          name: row.name,
          nickname: row.nickname,
          phone: row.phone,
          email: row.email,
          status: row.status,
          createdAt: row.createdAt,
          bannedAt: row.bannedAt,
          bannedUntil: row.bannedUntil,
          deletedAt: row.deletedAt,
        },
        tradeSummary: {
          sellCount: Number(tradeSummary.sellCount),
          buyCount: Number(tradeSummary.buyCount),
          auctionBidCount: Number(tradeSummary.auctionBidCount),
        },
        reviewSummary: {
          reviewCount: Number(reviewSummary.reviewCount),
          averageRating: Number(reviewSummary.averageRating),
        },
        recentTransactions: recentTransactionsResult.rows,
        recentReviews: recentReviewsResult.rows,
        adminMemo: row.adminMemo,
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "GET_ADMIN_USER_FAILED",
        message: "회원 상세를 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
        details: { userIdx },
      }),
    );
  }
}

export async function listUserTransactionsForAdmin(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { userIdx } = req.params;
  const targetIdx = Number(userIdx);
  const page = toPage(req.query);
  const limit = toLimit(req.query, 10);
  const offset = (page - 1) * limit;

  if (!Number.isInteger(targetIdx) || targetIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_USER_IDX",
        message: "유효하지 않은 사용자 ID입니다.",
        details: { userIdx },
      }),
    );
  }

  try {
    const result = await query(
      `
      SELECT
        t.idx AS "transactionIdx",
        t.listing_idx AS "listingIdx",
        pi.image_url AS "thumbnailUrl",
        l.title AS "title",
        l.listing_type AS "listingType",
        CASE WHEN t.seller_idx = $1 THEN 'SELL' ELSE 'BUY' END AS "tradeRole",
        t.amount AS "amount",
        t.status::TEXT AS "status",
        t.completed_at AS "completedAt"
      FROM transactions t
      INNER JOIN listings l ON l.idx = t.listing_idx
      LEFT JOIN post_images pi ON pi.listing_idx = l.idx AND pi.sort_order = 0
      WHERE t.seller_idx = $1 OR t.buyer_idx = $1
      ORDER BY COALESCE(t.completed_at, t.created_at) DESC
      LIMIT $2
      OFFSET $3
      `,
      [targetIdx, limit, offset],
    );

    const countResult = await query(
      `SELECT COUNT(*) AS total_count FROM transactions WHERE seller_idx = $1 OR buyer_idx = $1`,
      [targetIdx],
    );

    const totalCount = Number(countResult.rows[0].total_count);

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_ADMIN_USER_TRANSACTIONS_FAILED",
        message: "회원의 거래 활동을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
        details: { userIdx },
      }),
    );
  }
}

export async function listUserReviewsForAdmin(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  // 응답 형식은 GET /api/users/:userIdx/reviews와 동일하게 맞춘다.
  // (strengthTags/weaknessTags는 review_tags 테이블이 아직 없어서 제외)
  const { userIdx } = req.params;
  const targetIdx = Number(userIdx);
  const { type = "ALL" } = req.query;
  const page = toPage(req.query);
  const limit = toLimit(req.query, 9);
  const offset = (page - 1) * limit;

  if (!Number.isInteger(targetIdx) || targetIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_USER_IDX",
        message: "유효하지 않은 사용자 ID입니다.",
        details: { userIdx },
      }),
    );
  }

  const allowedTypes = ["ALL", "BUYER_REVIEW", "SELLER_REVIEW"];
  if (!allowedTypes.includes(type)) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_REVIEW_TYPE",
        message: "유효하지 않은 후기 유형입니다.",
        details: { type },
      }),
    );
  }

  try {
    const result = await query(
      `
      SELECT
        r.idx AS "reviewIdx",
        r.transaction_idx AS "transactionIdx",
        r.reviewer_idx AS "reviewerIdx",
        u.nickname AS "reviewerNickname",
        r.reviewee_idx AS "revieweeIdx",
        r.rating AS "rating",
        r.content AS "content",
        l.title AS "listingTitle",
        CASE
          WHEN t.buyer_idx = r.reviewer_idx THEN 'BUYER_REVIEW'
          WHEN t.seller_idx = r.reviewer_idx THEN 'SELLER_REVIEW'
        END AS "reviewType",
        r.created_at AS "createdAt"
      FROM reviews r
      INNER JOIN transactions t ON t.idx = r.transaction_idx
      INNER JOIN listings l ON l.idx = t.listing_idx
      INNER JOIN users u ON u.idx = r.reviewer_idx
      WHERE r.reviewee_idx = $1
        AND (
          $2 = 'ALL'
          OR ($2 = 'BUYER_REVIEW' AND t.buyer_idx = r.reviewer_idx)
          OR ($2 = 'SELLER_REVIEW' AND t.seller_idx = r.reviewer_idx)
        )
      ORDER BY r.created_at DESC
      LIMIT $3
      OFFSET $4
      `,
      [targetIdx, type, limit, offset],
    );

    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count
      FROM reviews r
      INNER JOIN transactions t ON t.idx = r.transaction_idx
      WHERE r.reviewee_idx = $1
        AND (
          $2 = 'ALL'
          OR ($2 = 'BUYER_REVIEW' AND t.buyer_idx = r.reviewer_idx)
          OR ($2 = 'SELLER_REVIEW' AND t.seller_idx = r.reviewer_idx)
        )
      `,
      [targetIdx, type],
    );

    const totalCount = Number(countResult.rows[0].total_count);

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_ADMIN_USER_REVIEWS_FAILED",
        message: "회원의 후기 활동을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
        details: { userIdx },
      }),
    );
  }
}

export async function banUser(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { userIdx } = req.params;
  const targetIdx = Number(userIdx);
  const { reason } = req.body ?? {};

  if (!Number.isInteger(targetIdx) || targetIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_USER_IDX",
        message: "유효하지 않은 사용자 ID입니다.",
        details: { userIdx },
      }),
    );
  }

  if (typeof reason !== "string" || !reason.trim()) {
    return next(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "정지 사유를 입력해주세요.",
        details: { field: "reason" },
      }),
    );
  }

  if (targetIdx === req.user.idx) {
    return next(
      new AppError({
        status: 409,
        code: "CONFLICT",
        message: "본인은 정지할 수 없습니다.",
      }),
    );
  }

  try {
    const banned = await withTransaction(async (client) => {
      const userResult = await client.query(
        `SELECT idx, banned_at FROM users WHERE idx = $1 FOR UPDATE`,
        [targetIdx],
      );

      if (userResult.rows.length === 0) {
        throw new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "회원을 찾을 수 없습니다.",
          details: { userIdx },
        });
      }

      if (userResult.rows[0].banned_at) {
        throw new AppError({
          status: 409,
          code: "CONFLICT",
          message: "이미 영구정지된 회원입니다.",
        });
      }

      const bannedResult = await client.query(
        `UPDATE users SET banned_at = NOW(), ban_reason = $2
         WHERE idx = $1
         RETURNING banned_at, banned_until`,
        [targetIdx, reason],
      );

      // 1) 진행 중(REQUESTED) 거래는 취소 처리하고 상대방에게 알림을 남긴다.
      const canceledTx = await client.query(
        `UPDATE transactions
         SET status = 'CANCELED', canceled_by = $1, updated_at = NOW()
         WHERE (seller_idx = $1 OR buyer_idx = $1) AND status = 'REQUESTED'
         RETURNING idx, seller_idx, buyer_idx`,
        [targetIdx],
      );

      for (const tx of canceledTx.rows) {
        const counterpartIdx = tx.seller_idx === targetIdx ? tx.buyer_idx : tx.seller_idx;
        await client.query(
          `INSERT INTO notifications (receiver_idx, notification_type, reference_type, reference_idx, content)
           VALUES ($1, 'PAYMENT_CANCELED', 'TRANSACTION', $2, '거래 상대방의 계정 정지로 거래가 취소되었습니다.')`,
          [counterpartIdx, tx.idx],
        );
      }

      // 2) 판매 중인 중고글/진행중 경매를 soft delete하고 관심목록에서 제거한다.
      const deletedListings = await client.query(
        `UPDATE listings l
         SET deleted_at = NOW(), delete_reason = '회원 영구정지로 인한 자동 삭제'
         WHERE l.seller_idx = $1
           AND l.deleted_at IS NULL
           AND (
             (l.listing_type = 'USED' AND EXISTS (
               SELECT 1 FROM used_posts up WHERE up.listing_idx = l.idx AND up.trade_status = 'ON_SALE'
             ))
             OR
             (l.listing_type = 'AUCTION' AND EXISTS (
               SELECT 1 FROM auction_posts ap WHERE ap.listing_idx = l.idx AND ap.status = 'ON_GOING'
             ))
           )
         RETURNING idx`,
        [targetIdx],
      );

      const deletedListingIdxs = deletedListings.rows.map((row) => row.idx);

      if (deletedListingIdxs.length > 0) {
        await client.query(`DELETE FROM favorites WHERE listing_idx = ANY($1::BIGINT[])`, [
          deletedListingIdxs,
        ]);
      }

      // 3) 다른 사람이 올린 진행중 경매에서 내가 최고 입찰자였다면 최고 입찰자를 재계산한다.
      const excludedListingIdxs = deletedListingIdxs.length > 0 ? deletedListingIdxs : [0];

      const leadingAuctions = await client.query(
        `SELECT ap.listing_idx, ap.start_price
         FROM auction_posts ap
         WHERE ap.status = 'ON_GOING'
           AND NOT (ap.listing_idx = ANY($1::BIGINT[]))
           AND (
             SELECT ab.bidder_idx FROM auction_bids ab
             WHERE ab.listing_idx = ap.listing_idx
             ORDER BY ab.bid_price DESC, ab.created_at ASC
             LIMIT 1
           ) = $2`,
        [excludedListingIdxs, targetIdx],
      );

      for (const auction of leadingAuctions.rows) {
        const nextBid = await client.query(
          `SELECT bid_price FROM auction_bids
           WHERE listing_idx = $1 AND bidder_idx <> $2
           ORDER BY bid_price DESC, created_at ASC
           LIMIT 1`,
          [auction.listing_idx, targetIdx],
        );

        const nextPrice = nextBid.rows[0]?.bid_price ?? auction.start_price;

        await client.query(`UPDATE auction_posts SET current_price = $2 WHERE listing_idx = $1`, [
          auction.listing_idx,
          nextPrice,
        ]);
      }

      return bannedResult.rows[0];
    });

    return res.status(200).json({
      success: true,
      data: {
        userIdx: targetIdx,
        banned: true,
        bannedAt: banned.banned_at,
        bannedUntil: banned.banned_until,
      },
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);

    return next(
      new AppError({
        status: 500,
        code: "BAN_USER_FAILED",
        message: "회원을 영구정지하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
        details: { userIdx },
      }),
    );
  }
}

export async function updateUserMemo(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { userIdx } = req.params;
  const targetIdx = Number(userIdx);
  const { memo = "" } = req.body ?? {};

  if (!Number.isInteger(targetIdx) || targetIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_USER_IDX",
        message: "유효하지 않은 사용자 ID입니다.",
        details: { userIdx },
      }),
    );
  }

  if (typeof memo !== "string") {
    return next(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "메모 형식이 올바르지 않습니다.",
        details: { field: "memo" },
      }),
    );
  }

  try {
    const result = await query(
      `UPDATE users SET admin_memo = $2, updated_at = NOW() WHERE idx = $1 RETURNING idx, updated_at`,
      [targetIdx, memo],
    );

    if (result.rows.length === 0) {
      return next(
        new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "회원을 찾을 수 없습니다.",
          details: { userIdx },
        }),
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        userIdx: targetIdx,
        memo,
        saved: true,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "UPDATE_USER_MEMO_FAILED",
        message: "회원 메모를 저장하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
        details: { userIdx },
      }),
    );
  }
}

// =====================================================
// 중고거래 관리
// =====================================================

export async function listUsedForAdmin(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { q, status } = req.query;
  const page = toPage(req.query);
  const limit = toLimit(req.query, 11);
  const offset = (page - 1) * limit;
  const qLike = q ? `%${q}%` : null;

  try {
    const result = await query(
      `
      SELECT
        l.idx AS "listingIdx",
        l.title AS "title",
        pi.image_url AS "thumbnailUrl",
        seller.idx AS "sellerIdx",
        seller.nickname AS "sellerNickname",
        buyer.idx AS "buyerIdx",
        buyer.nickname AS "buyerNickname",
        up.price AS "price",
        up.trade_status::TEXT AS "tradeStatus",
        t.completed_at AS "completedAt",
        l.deleted_at AS "deletedAt",
        l.created_at AS "createdAt"
      FROM listings l
      INNER JOIN used_posts up ON up.listing_idx = l.idx
      INNER JOIN users seller ON seller.idx = l.seller_idx
      LEFT JOIN post_images pi ON pi.listing_idx = l.idx AND pi.sort_order = 0
      LEFT JOIN transactions t ON t.listing_idx = l.idx AND t.status = 'COMPLETED'
      LEFT JOIN users buyer ON buyer.idx = t.buyer_idx
      WHERE l.listing_type = 'USED'
        AND (
          $1::TEXT IS NULL
          OR l.title ILIKE $1
          OR seller.nickname ILIKE $1
          OR seller.login_id ILIKE $1
        )
        AND ($2::TEXT IS NULL OR up.trade_status::TEXT = $2)
      ORDER BY l.created_at DESC
      LIMIT $3
      OFFSET $4
      `,
      [qLike, status || null, limit, offset],
    );

    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count
      FROM listings l
      INNER JOIN used_posts up ON up.listing_idx = l.idx
      INNER JOIN users seller ON seller.idx = l.seller_idx
      WHERE l.listing_type = 'USED'
        AND (
          $1::TEXT IS NULL
          OR l.title ILIKE $1
          OR seller.nickname ILIKE $1
          OR seller.login_id ILIKE $1
        )
        AND ($2::TEXT IS NULL OR up.trade_status::TEXT = $2)
      `,
      [qLike, status || null],
    );

    const totalCount = Number(countResult.rows[0].total_count);

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_ADMIN_USED_FAILED",
        message: "중고거래 목록을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    );
  }
}

export async function deleteUsedForAdmin(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { listingIdx } = req.params;
  const targetIdx = Number(listingIdx);
  const { deleteReason } = req.body ?? {};

  if (!Number.isInteger(targetIdx) || targetIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_LISTING_IDX",
        message: "유효하지 않은 게시글 ID입니다.",
        details: { listingIdx },
      }),
    );
  }

  try {
    const result = await withTransaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE listings
         SET deleted_at = NOW(), deleted_by = $2, delete_reason = $3
         WHERE idx = $1 AND listing_type = 'USED' AND deleted_at IS NULL
         RETURNING idx, deleted_at`,
        [targetIdx, req.user.idx, deleteReason || "관리자 삭제"],
      );

      if (updateResult.rows.length === 0) {
        throw new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "게시글을 찾을 수 없습니다.",
          details: { listingIdx },
        });
      }

      await client.query(`DELETE FROM favorites WHERE listing_idx = $1`, [targetIdx]);

      return updateResult.rows[0];
    });

    return res.status(200).json({
      success: true,
      data: {
        listingIdx: targetIdx,
        deleted: true,
        deletedAt: result.deleted_at,
        deletedBy: req.user.idx,
      },
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);

    return next(
      new AppError({
        status: 500,
        code: "DELETE_ADMIN_USED_FAILED",
        message: "중고거래 게시글을 삭제하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
        details: { listingIdx },
      }),
    );
  }
}

// =====================================================
// 경매 관리
// =====================================================

export async function listAuctionsForAdmin(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { q, status } = req.query;
  const page = toPage(req.query);
  const limit = toLimit(req.query, 11);
  const offset = (page - 1) * limit;
  const qLike = q ? `%${q}%` : null;

  try {
    const result = await query(
      `
      SELECT
        l.idx AS "listingIdx",
        l.title AS "title",
        pi.image_url AS "thumbnailUrl",
        seller.idx AS "sellerIdx",
        seller.nickname AS "sellerNickname",
        ap.start_price AS "startPrice",
        ap.current_price AS "currentPrice",
        ap.status::TEXT AS "status",
        (SELECT COUNT(*) FROM auction_bids ab WHERE ab.listing_idx = l.idx) AS "bidCount",
        l.deleted_at AS "deletedAt",
        ap.ends_at AS "endsAt"
      FROM listings l
      INNER JOIN auction_posts ap ON ap.listing_idx = l.idx
      INNER JOIN users seller ON seller.idx = l.seller_idx
      LEFT JOIN post_images pi ON pi.listing_idx = l.idx AND pi.sort_order = 0
      WHERE l.listing_type = 'AUCTION'
        AND (
          $1::TEXT IS NULL
          OR l.title ILIKE $1
          OR seller.nickname ILIKE $1
          OR seller.login_id ILIKE $1
        )
        AND ($2::TEXT IS NULL OR ap.status::TEXT = $2)
      ORDER BY l.created_at DESC
      LIMIT $3
      OFFSET $4
      `,
      [qLike, status || null, limit, offset],
    );

    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count
      FROM listings l
      INNER JOIN auction_posts ap ON ap.listing_idx = l.idx
      INNER JOIN users seller ON seller.idx = l.seller_idx
      WHERE l.listing_type = 'AUCTION'
        AND (
          $1::TEXT IS NULL
          OR l.title ILIKE $1
          OR seller.nickname ILIKE $1
          OR seller.login_id ILIKE $1
        )
        AND ($2::TEXT IS NULL OR ap.status::TEXT = $2)
      `,
      [qLike, status || null],
    );

    const totalCount = Number(countResult.rows[0].total_count);

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows.map((row) => ({ ...row, bidCount: Number(row.bidCount) })),
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_ADMIN_AUCTIONS_FAILED",
        message: "경매 목록을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    );
  }
}

export async function deleteAuctionForAdmin(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { listingIdx } = req.params;
  const targetIdx = Number(listingIdx);
  const { deleteReason } = req.body ?? {};

  if (!Number.isInteger(targetIdx) || targetIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_LISTING_IDX",
        message: "유효하지 않은 게시글 ID입니다.",
        details: { listingIdx },
      }),
    );
  }

  try {
    const result = await withTransaction(async (client) => {
      const auctionResult = await client.query(
        `SELECT status FROM auction_posts WHERE listing_idx = $1`,
        [targetIdx],
      );

      const updateResult = await client.query(
        `UPDATE listings
         SET deleted_at = NOW(), deleted_by = $2, delete_reason = $3
         WHERE idx = $1 AND listing_type = 'AUCTION' AND deleted_at IS NULL
         RETURNING idx, deleted_at`,
        [targetIdx, req.user.idx, deleteReason || "관리자 삭제"],
      );

      if (updateResult.rows.length === 0) {
        throw new AppError({
          status: 404,
          code: "NOT_FOUND",
          message: "경매를 찾을 수 없습니다.",
          details: { listingIdx },
        });
      }

      await client.query(`DELETE FROM favorites WHERE listing_idx = $1`, [targetIdx]);

      let notifiedBidderCount = 0;

      if (auctionResult.rows[0]?.status === "ON_GOING") {
        const biddersResult = await client.query(
          `SELECT DISTINCT bidder_idx FROM auction_bids WHERE listing_idx = $1`,
          [targetIdx],
        );

        for (const bidder of biddersResult.rows) {
          await client.query(
            `INSERT INTO notifications (receiver_idx, notification_type, reference_type, reference_idx, content)
             VALUES ($1, 'LISTING_DELETED', 'LISTING', $2, '입찰하신 경매 게시글이 관리자에 의해 삭제되었습니다.')`,
            [bidder.bidder_idx, targetIdx],
          );
        }

        notifiedBidderCount = biddersResult.rows.length;
      }

      return { ...updateResult.rows[0], notifiedBidderCount };
    });

    return res.status(200).json({
      success: true,
      data: {
        listingIdx: targetIdx,
        deleted: true,
        deletedAt: result.deleted_at,
        deletedBy: req.user.idx,
        notifiedBidderCount: result.notifiedBidderCount,
      },
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);

    return next(
      new AppError({
        status: 500,
        code: "DELETE_ADMIN_AUCTION_FAILED",
        message: "경매 게시글을 삭제하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
        details: { listingIdx },
      }),
    );
  }
}

export async function listAuctionWinners(req, res, next) {
  const authError = requireAdmin(req);
  if (authError) return next(authError);

  const { q } = req.query;
  const page = toPage(req.query);
  const limit = toLimit(req.query, 11);
  const offset = (page - 1) * limit;
  const qLike = q ? `%${q}%` : null;

  try {
    const result = await query(
      `
      SELECT
        l.idx AS "listingIdx",
        l.title AS "title",
        winner.idx AS "winnerIdx",
        winner.nickname AS "winnerNickname",
        seller.idx AS "sellerIdx",
        seller.nickname AS "sellerNickname",
        wb.bid_price AS "finalPrice",
        ap.ends_at AS "endedAt",
        t.status::TEXT AS "transactionStatus"
      FROM auction_posts ap
      INNER JOIN listings l ON l.idx = ap.listing_idx
      INNER JOIN auction_bids wb ON wb.idx = ap.winning_bid_idx
      INNER JOIN users winner ON winner.idx = wb.bidder_idx
      INNER JOIN users seller ON seller.idx = l.seller_idx
      LEFT JOIN transactions t ON t.listing_idx = l.idx
      WHERE ap.status = 'FINISHED'
        AND ap.winning_bid_idx IS NOT NULL
        AND (
          $1::TEXT IS NULL
          OR l.title ILIKE $1
          OR winner.nickname ILIKE $1
          OR seller.nickname ILIKE $1
        )
      ORDER BY ap.ends_at DESC
      LIMIT $2
      OFFSET $3
      `,
      [qLike, limit, offset],
    );

    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count
      FROM auction_posts ap
      INNER JOIN listings l ON l.idx = ap.listing_idx
      INNER JOIN auction_bids wb ON wb.idx = ap.winning_bid_idx
      INNER JOIN users winner ON winner.idx = wb.bidder_idx
      INNER JOIN users seller ON seller.idx = l.seller_idx
      WHERE ap.status = 'FINISHED'
        AND ap.winning_bid_idx IS NOT NULL
        AND (
          $1::TEXT IS NULL
          OR l.title ILIKE $1
          OR winner.nickname ILIKE $1
          OR seller.nickname ILIKE $1
        )
      `,
      [qLike],
    );

    const totalCount = Number(countResult.rows[0].total_count);

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_ADMIN_AUCTION_WINNERS_FAILED",
        message: "경매 낙찰자 목록을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    );
  }
}
