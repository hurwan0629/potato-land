import { query, withTransaction } from "../../infrastructure/database/database.js";

export async function findActiveReviewTags() {
  const result = await query(
    `SELECT idx AS "tagIdx", label, sentiment, sort_order AS "sortOrder"
       FROM review_tags
      WHERE is_active = TRUE
      ORDER BY sentiment, sort_order, idx`,
  );
  return result.rows;
}

/**
 * 1. 거래 행을 잠가 완료 상태와 참여자를 확인한다.
 * 2. 후기를 저장하고 선택 태그를 연결한다.
 * 3. 같은 transaction 안에서 수신자 알림을 저장한다.
 */
export async function insertReview({ transactionIdx, reviewerIdx, revieweeIdx, rating, content, tagIds }) {
  return withTransaction(async (client) => {
    const transactionResult = await client.query(
      `SELECT idx, seller_idx, buyer_idx, status
         FROM transactions
        WHERE idx = $1
        FOR UPDATE`,
      [transactionIdx],
    );
    const transaction = transactionResult.rows[0];
    if (!transaction) return { failure: "NOT_PARTICIPANT" };

    const isSeller = Number(transaction.seller_idx) === Number(reviewerIdx);
    const isBuyer = Number(transaction.buyer_idx) === Number(reviewerIdx);
    if (!isSeller && !isBuyer) return { failure: "NOT_PARTICIPANT" };

    const expectedRevieweeIdx = Number(isSeller ? transaction.buyer_idx : transaction.seller_idx);
    if (expectedRevieweeIdx !== Number(revieweeIdx)) return { failure: "INVALID_REVIEWEE" };
    if (transaction.status !== "COMPLETED") return { failure: "NOT_COMPLETED" };

    const duplicate = await client.query(
      "SELECT idx FROM reviews WHERE transaction_idx = $1 AND reviewer_idx = $2",
      [transactionIdx, reviewerIdx],
    );
    if (duplicate.rows[0]) return { failure: "DUPLICATE" };

    if (tagIds.length > 0) {
      const tags = await client.query(
        `SELECT idx FROM review_tags
          WHERE idx = ANY($1::bigint[]) AND is_active = TRUE`,
        [tagIds],
      );
      if (tags.rowCount !== tagIds.length) return { failure: "INVALID_TAG" };
    }

    const reviewResult = await client.query(
      `INSERT INTO reviews (transaction_idx, reviewer_idx, reviewee_idx, rating, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING idx, created_at`,
      [transactionIdx, reviewerIdx, revieweeIdx, rating, content],
    );
    const review = reviewResult.rows[0];

    for (const tagIdx of tagIds) {
      await client.query(
        "INSERT INTO review_tag_links (review_idx, tag_idx) VALUES ($1, $2)",
        [review.idx, tagIdx],
      );
    }

    const notificationResult = await client.query(
      `INSERT INTO notifications
         (receiver_idx, notification_type, reference_type, reference_idx, content)
       VALUES ($1, 'NEW_REVIEW', 'REVIEW', $2, '새로운 후기가 도착했습니다.')
       RETURNING idx, receiver_idx, notification_type, reference_type,
                 reference_idx, content, is_read, created_at`,
      [revieweeIdx, review.idx],
    );
    const unreadResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM notifications WHERE receiver_idx = $1 AND is_read = FALSE",
      [revieweeIdx],
    );

    return {
      review,
      notification: notificationResult.rows[0],
      unreadCount: unreadResult.rows[0].count,
    };
  });
}

export async function findReceivedReviews({ userIdx, type, page, limit, offset }) {
  const values = [userIdx, type, limit, offset];
  const roleExpression = `CASE
    WHEN t.buyer_idx = r.reviewer_idx THEN 'BUYER_REVIEW'
    ELSE 'SELLER_REVIEW'
  END`;
  const where = `r.reviewee_idx = $1
    AND ($2 = 'ALL' OR ${roleExpression} = $2)`;

  const [items, count] = await Promise.all([
    query(
      `SELECT r.idx AS "reviewIdx", r.transaction_idx AS "transactionIdx",
              r.reviewer_idx AS "reviewerIdx", u.nickname AS "reviewerNickname",
              u.profile_image AS "reviewerProfileImageUrl", r.rating, r.content,
              l.idx AS "listingIdx", l.title AS "listingTitle",
              ${roleExpression} AS "reviewType", r.created_at AS "createdAt",
              COALESCE(
                json_agg(json_build_object(
                  'tagIdx', rt.idx, 'label', rt.label, 'sentiment', rt.sentiment
                ) ORDER BY rt.sort_order) FILTER (WHERE rt.idx IS NOT NULL),
                '[]'::json
              ) AS tags
         FROM reviews r
         JOIN transactions t ON t.idx = r.transaction_idx
         JOIN listings l ON l.idx = t.listing_idx
         JOIN users u ON u.idx = r.reviewer_idx
         LEFT JOIN review_tag_links rtl ON rtl.review_idx = r.idx
         LEFT JOIN review_tags rt ON rt.idx = rtl.tag_idx
        WHERE ${where}
        GROUP BY r.idx, t.buyer_idx, u.idx, l.idx
        ORDER BY r.created_at DESC, r.idx DESC
        LIMIT $3 OFFSET $4`,
      values,
    ),
    query(
      `SELECT COUNT(*)::int AS count
         FROM reviews r JOIN transactions t ON t.idx = r.transaction_idx
        WHERE ${where}`,
      values.slice(0, 2),
    ),
  ]);

  return {
    rows: items.rows,
    totalCount: count.rows[0].count,
    page,
    limit,
  };
}
