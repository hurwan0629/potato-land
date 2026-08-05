import { query } from "../../infrastructure/database/database.js"
import { AppError } from "../../common/errors/AppError.js"

export async function listMyListings(req, res, next) {
  // 내 판매상품 조회 (로그인 사용자 전용)
  // 쿼리문을 작성하면 all, USED, AUCTION으로 필터링
  const sellerIdx = req.user?.idx;

  const {
    type = "ALL",
    status,
    page = 1,
    limit = 5,
  } = req.query

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.min(
    Math.max(Number(limit) || 5, 1),
    100,
  )

  // 로그인 검증
  if (!sellerIdx) {
    return next(
      new AppError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      }),
    );
  }

  // type 검증
  const allowedTypes = ["ALL", "USED", "AUCTION"];

  if (!allowedTypes.includes(type)) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_LISTING_TYPE",
        message: "유효하지 않은 상품 유형입니다.",
        details: {
          type,
        },
      }),
    );
  }

  const offset = (currentPage - 1) * pageLimit;

  try {
    const result = await query(
      `
      SELECT
        l.idx AS "listingIdx",
        l.listing_type AS "listingType",
        l.title AS "title",

        pi.image_url AS "thumbnailUrl",

        CASE
          WHEN l.listing_type = 'USED'
            THEN up.price
          WHEN l.listing_type = 'AUCTION'
            THEN ap.current_price
        END AS "displayPrice",

        CASE
          WHEN l.listing_type = 'USED'
            THEN up.trade_status::TEXT
          WHEN l.listing_type = 'AUCTION'
            THEN ap.status::TEXT
        END AS "status",

        l.created_at AS "createdAt"

      FROM listings l

      LEFT JOIN used_posts up
        ON up.listing_idx = l.idx

      LEFT JOIN auction_posts ap
        ON ap.listing_idx = l.idx

      LEFT JOIN post_images pi
        ON pi.listing_idx = l.idx
       AND pi.sort_order = 0

      WHERE l.seller_idx = $1
        AND l.deleted_at IS NULL
        AND ($2 = 'ALL' OR l.listing_type::TEXT = $2)
        AND ($3::TEXT IS NULL OR (l.listing_type = 'USED' AND up.trade_status::TEXT = $3) OR (l.listing_type = 'AUCTION' AND ap.status::TEXT = $3))
      ORDER BY l.created_at DESC
      LIMIT $4
      OFFSET $5
      `,
      [sellerIdx, type, status || null, pageLimit, offset],
    )

    // 전체 판매상품 개수
    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count

      FROM listings l

      LEFT JOIN used_posts up
        ON up.listing_idx = l.idx

      LEFT JOIN auction_posts ap
        ON ap.listing_idx = l.idx

      WHERE l.seller_idx = $1
        AND l.deleted_at IS NULL
        AND ($2 = 'ALL' OR l.listing_type::TEXT = $2)
        AND ($3::TEXT IS NULL OR (l.listing_type = 'USED' AND up.trade_status::TEXT = $3) OR (l.listing_type = 'AUCTION' AND ap.status::TEXT = $3))
      `,
      [sellerIdx, type, status || null],
    )

    const totalCount = Number(countResult.rows[0].total_count)
    const totalPages = Math.ceil(totalCount / pageLimit)

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page: currentPage,
        limit: pageLimit,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_MY_LISTINGS_FAILED",
        message: "내 판매상품을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    )
  }
}

export async function listMyFavorites(req, res, next) {
  // 관심목록 조회 (로그인 사용자 전용)
  // 쿼리문을 작성하면 all, AUCTION, USED으로 필터링
  const sellerIdx = req.user?.idx;

  const {
    type = "ALL",
    status,
    page = 1,
    limit = 16,
  } = req.query

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.min(
    Math.max(Number(limit) || 16, 1),
    100,
  )

  // 로그인 검증
  if (!sellerIdx) {
    return next(
      new AppError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      }),
    );
  }

  // type 검증
  const allowedTypes = ["ALL", "USED", "AUCTION"];

  if (!allowedTypes.includes(type)) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_FAVORITE_TYPE",
        message: "유효하지 않은 관심상품 유형입니다.",
        details: {
          type,
        },
      }),
    );
  }

  const offset = (currentPage - 1) * pageLimit;

  try {
    const result = await query(
      `
      SELECT
        l.idx AS "listingIdx",
        l.listing_type AS "listingType",
        l.title AS "title",

        pi.image_url AS "thumbnailUrl",

        CASE
          WHEN l.listing_type = 'USED'
            THEN up.price
          WHEN l.listing_type = 'AUCTION'
            THEN ap.current_price
        END AS "displayPrice",

        CASE
          WHEN l.listing_type = 'USED'
            THEN up.trade_status::TEXT
          WHEN l.listing_type = 'AUCTION'
            THEN ap.status::TEXT
        END AS "status",

        f.created_at AS "favoritedAt"

      FROM favorites f

      INNER JOIN listings l
        ON l.idx = f.listing_idx

      LEFT JOIN used_posts up
        ON up.listing_idx = l.idx

      LEFT JOIN auction_posts ap
        ON ap.listing_idx = l.idx

      LEFT JOIN post_images pi
        ON pi.listing_idx = l.idx
       AND pi.sort_order = 0
      WHERE f.user_idx = $1
        AND l.deleted_at IS NULL
        AND ($2 = 'ALL' OR l.listing_type::TEXT = $2)
        AND ($3::TEXT IS NULL OR (l.listing_type = 'USED'AND up.trade_status::TEXT = $3) OR (l.listing_type = 'AUCTION' AND ap.status::TEXT = $3))
      ORDER BY f.created_at DESC
      LIMIT $4
      OFFSET $5
      `,[sellerIdx,type,status || null,pageLimit,offset,])

    // 전체 관심상품 개수
    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count

      FROM favorites f

      INNER JOIN listings l
        ON l.idx = f.listing_idx

      LEFT JOIN used_posts up
        ON up.listing_idx = l.idx

      LEFT JOIN auction_posts ap
        ON ap.listing_idx = l.idx

      WHERE f.user_idx = $1
        AND l.deleted_at IS NULL

        AND (
          $2 = 'ALL'
          OR l.listing_type::TEXT = $2
        )

        AND (
          $3::TEXT IS NULL

          OR (
            l.listing_type = 'USED'
            AND up.trade_status::TEXT = $3
          )

          OR (
            l.listing_type = 'AUCTION'
            AND ap.status::TEXT = $3
          )
        )
      `,
      [
        sellerIdx,
        type,
        status || null,
      ],
    )

    const totalCount = Number(countResult.rows[0].total_count)
    const totalPages = Math.ceil(totalCount / pageLimit)

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page: currentPage,
        limit: pageLimit,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_MY_FAVORITES_FAILED",
        message: "내 관심목록을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    )
  }
}

export async function listMyHistory(req, res, next) {
  // 거래 내역 조회 (로그인 사용자 전용)
  // transactions에서 seller_idx/buyer_idx를 기준으로 조회하고,
  // 완료 거래뿐 아니라 사용자가 입찰중인 진행중 경매도 함께 반환한다.
  // type: ALL, SELL, BUY, AUCTION / status: transaction_status / q: 상품명 검색
  const userIdx = req.user?.idx;

  const {
    type = "ALL",
    status,
    q,
    page = 1,
    limit = 10,
  } = req.query

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    100,
  )

  // 로그인 검증
  if (!userIdx) {
    return next(
      new AppError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      }),
    );
  }

  // type 검증
  const allowedTypes = ["ALL", "SELL", "BUY", "AUCTION"];

  if (!allowedTypes.includes(type)) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_HISTORY_TYPE",
        message: "유효하지 않은 거래 유형입니다.",
        details: {
          type,
        },
      }),
    );
  }

  const offset = (currentPage - 1) * pageLimit;
  const keyword = q ? `%${q}%` : null;

  // 완료/진행중/취소된 거래 내역 + 사용자가 입찰중인 진행중 경매를
  // 하나의 목록으로 합쳐서 페이지네이션한다.
  const historyCte = `
    WITH history AS (
      SELECT
        t.idx AS "transactionIdx",
        t.listing_idx AS "listingIdx",
        l.listing_type AS "listingType",
        l.title AS "title",
        pi.image_url AS "thumbnailUrl",
        CASE WHEN t.buyer_idx = $1 THEN 'BUY' ELSE 'SELL' END AS "tradeRole",
        t.status::TEXT AS "status",
        t.amount AS "amount",
        COALESCE(t.completed_at, t.created_at) AS "transactionAt",
        NULL::TIMESTAMPTZ AS "endsAt",
        CASE WHEN t.buyer_idx = $1 THEN t.seller_idx ELSE t.buyer_idx END AS "counterpartIdx",
        counterpart.nickname AS "counterpartNickname",
        (
          t.status = 'COMPLETED'
          AND NOT EXISTS (
            SELECT 1 FROM reviews r
            WHERE r.transaction_idx = t.idx
              AND r.reviewer_idx = $1
          )
        ) AS "canWriteReview"
      FROM transactions t
      INNER JOIN listings l
        ON l.idx = t.listing_idx
      INNER JOIN users counterpart
        ON counterpart.idx = CASE WHEN t.buyer_idx = $1 THEN t.seller_idx ELSE t.buyer_idx END
      LEFT JOIN post_images pi
        ON pi.listing_idx = l.idx
       AND pi.sort_order = 0
      WHERE (t.buyer_idx = $1 OR t.seller_idx = $1)

      UNION ALL

      SELECT
        NULL AS "transactionIdx",
        l.idx AS "listingIdx",
        l.listing_type AS "listingType",
        l.title AS "title",
        pi.image_url AS "thumbnailUrl",
        'AUCTION' AS "tradeRole",
        ap.status::TEXT AS "status",
        ap.current_price AS "amount",
        NULL::TIMESTAMPTZ AS "transactionAt",
        ap.ends_at AS "endsAt",
        NULL::BIGINT AS "counterpartIdx",
        NULL::VARCHAR AS "counterpartNickname",
        FALSE AS "canWriteReview"
      FROM auction_posts ap
      INNER JOIN listings l
        ON l.idx = ap.listing_idx
      LEFT JOIN post_images pi
        ON pi.listing_idx = l.idx
       AND pi.sort_order = 0
      WHERE ap.status = 'ON_GOING'
        AND EXISTS (
          SELECT 1 FROM auction_bids ab
          WHERE ab.listing_idx = l.idx
            AND ab.bidder_idx = $1
        )
        AND NOT EXISTS (
          SELECT 1 FROM transactions t2
          WHERE t2.listing_idx = l.idx
            AND (t2.buyer_idx = $1 OR t2.seller_idx = $1)
        )
    )
  `;

  const whereClause = `
    WHERE ($2 = 'ALL' OR "tradeRole" = $2)
      AND ($3::TEXT IS NULL OR "status" = $3)
      AND ($4::TEXT IS NULL OR "title" ILIKE $4)
  `;

  try {
    const result = await query(
      `
      ${historyCte}
      SELECT * FROM history
      ${whereClause}
      ORDER BY COALESCE("transactionAt", "endsAt") DESC, "listingIdx" DESC
      LIMIT $5
      OFFSET $6
      `,
      [userIdx, type, status || null, keyword, pageLimit, offset],
    )

    const countResult = await query(
      `
      ${historyCte}
      SELECT COUNT(*) AS total_count FROM history
      ${whereClause}
      `,
      [userIdx, type, status || null, keyword],
    )

    const totalCount = Number(countResult.rows[0].total_count)
    const totalPages = Math.ceil(totalCount / pageLimit)

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page: currentPage,
        limit: pageLimit,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_MY_HISTORY_FAILED",
        message: "내 거래내역을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    )
  }
}

export async function listMyReviews(req, res, next) {
  // 거래 후기 조회 (로그인 사용자 전용)
  // reviewee_idx(내가 받은 후기) 기준으로 조회하고, reviewer가 해당 거래에서
  // 구매자였는지 판매자였는지에 따라 BUYER_REVIEW / SELLER_REVIEW로 필터링
  const revieweeIdx = req.user?.idx;

  const {
    type = "ALL",
    page = 1,
    limit = 9,
  } = req.query

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.min(
    Math.max(Number(limit) || 9, 1),
    100,
  )

  // 로그인 검증
  if (!revieweeIdx) {
    return next(
      new AppError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      }),
    );
  }

  // type 검증
  const allowedTypes = ["ALL", "BUYER_REVIEW", "SELLER_REVIEW"];

  if (!allowedTypes.includes(type)) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_REVIEW_TYPE",
        message: "유효하지 않은 후기 유형입니다.",
        details: {
          type,
        },
      }),
    );
  }

  const offset = (currentPage - 1) * pageLimit;

  try {
    const result = await query(
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
          WHEN t.buyer_idx = r.reviewer_idx
            THEN 'BUYER_REVIEW'
          WHEN t.seller_idx = r.reviewer_idx
            THEN 'SELLER_REVIEW'
        END AS "reviewType",

        r.created_at AS "createdAt"

      FROM reviews r

      INNER JOIN transactions t
        ON t.idx = r.transaction_idx

      INNER JOIN listings l
        ON l.idx = t.listing_idx

      INNER JOIN users u
        ON u.idx = r.reviewer_idx

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
      [revieweeIdx, type, pageLimit, offset],
    )

    // 전체 후기 개수
    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count

      FROM reviews r

      INNER JOIN transactions t
        ON t.idx = r.transaction_idx

      WHERE r.reviewee_idx = $1
        AND (
          $2 = 'ALL'
          OR ($2 = 'BUYER_REVIEW' AND t.buyer_idx = r.reviewer_idx)
          OR ($2 = 'SELLER_REVIEW' AND t.seller_idx = r.reviewer_idx)
        )
      `,
      [revieweeIdx, type],
    )

    const totalCount = Number(countResult.rows[0].total_count)
    const totalPages = Math.ceil(totalCount / pageLimit)

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page: currentPage,
        limit: pageLimit,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_MY_REVIEWS_FAILED",
        message: "내 후기를 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    )
  }
}

export async function listUserListings(req, res, next) {
  // 사용자의 판매상품 조회 (외부 공개 프로필용)
  // 쿼리문을 작성하면 all, USED, AUCTION으로 필터링
  const { userIdx } = req.params

  const {
    type = "ALL",
    status,
    page = 1,
    limit = 5,
  } = req.query

  const sellerIdx = Number(userIdx)
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageLimit = Math.min(
    Math.max(Number(limit) || 5, 1),
    100,
  )

  // userIdx 검증
  if (!Number.isInteger(sellerIdx) || sellerIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_USER_IDX",
        message: "유효하지 않은 사용자 ID입니다.",
        details: {
          userIdx,
        },
      }),
    );
  }

  // type 검증
  const allowedTypes = ["ALL", "USED", "AUCTION"];

  if (!allowedTypes.includes(type)) {
    return next(
      new AppError({
        status: 400,
        code: "INVALID_LISTING_TYPE",
        message: "유효하지 않은 상품 유형입니다.",
        details: {
          type,
        },
      }),
    );
  }

  const offset = (currentPage - 1) * pageLimit;

  try {
    const result = await query(
      `
      SELECT
        l.idx AS "listingIdx",
        l.listing_type AS "listingType",
        l.title AS "title",

        pi.image_url AS "thumbnailUrl",

        CASE
          WHEN l.listing_type = 'USED'
            THEN up.price
          WHEN l.listing_type = 'AUCTION'
            THEN ap.current_price
        END AS "displayPrice",

        CASE
          WHEN l.listing_type = 'USED'
            THEN up.trade_status::TEXT
          WHEN l.listing_type = 'AUCTION'
            THEN ap.status::TEXT
        END AS "status",

        l.created_at AS "createdAt"

      FROM listings l

      LEFT JOIN used_posts up
        ON up.listing_idx = l.idx

      LEFT JOIN auction_posts ap
        ON ap.listing_idx = l.idx

      LEFT JOIN post_images pi
        ON pi.listing_idx = l.idx
       AND pi.sort_order = 0

      WHERE l.seller_idx = $1
        AND l.deleted_at IS NULL
        AND ($2 = 'ALL' OR l.listing_type::TEXT = $2)
        AND ($3::TEXT IS NULL OR (l.listing_type = 'USED' AND up.trade_status::TEXT = $3) OR (l.listing_type = 'AUCTION' AND ap.status::TEXT = $3))
      ORDER BY l.created_at DESC
      LIMIT $4
      OFFSET $5
      `,
      [sellerIdx, type, status || null, pageLimit, offset],
    )

    // 전체 판매상품 개수
    const countResult = await query(
      `
      SELECT COUNT(*) AS total_count

      FROM listings l

      LEFT JOIN used_posts up
        ON up.listing_idx = l.idx

      LEFT JOIN auction_posts ap
        ON ap.listing_idx = l.idx

      WHERE l.seller_idx = $1
        AND l.deleted_at IS NULL
        AND ($2 = 'ALL' OR l.listing_type::TEXT = $2)
        AND ($3::TEXT IS NULL OR (l.listing_type = 'USED' AND up.trade_status::TEXT = $3) OR (l.listing_type = 'AUCTION' AND ap.status::TEXT = $3))
      `,
      [sellerIdx, type, status || null],
    )

    const totalCount = Number(countResult.rows[0].total_count)
    const totalPages = Math.ceil(totalCount / pageLimit)

    return res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        page: currentPage,
        limit: pageLimit,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    return next(
      new AppError({
        status: 500,
        code: "LIST_USER_LISTINGS_FAILED",
        message: "사용자의 판매상품을 조회하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
        details: {
          userIdx,
        },
      }),
    )
  }
}
