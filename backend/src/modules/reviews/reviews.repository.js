import {
  query,
  withTransaction,
} from "../../infrastructure/database/database.js";

/** 거래 상태와 참여자를 잠금 검증한 뒤 후기와 알림을 함께 저장한다. */
export async function insertReview({
  transactionIdx,
  reviewerIdx,
  revieweeIdx,
  rating,
  content,
}) {
  return withTransaction(async (client) => {
    const transactionResult = await client.query(
      `
        SELECT idx, seller_idx, buyer_idx, status
        FROM transactions
        WHERE idx = $1
        FOR UPDATE
      `,
      [transactionIdx],
    );
    const transaction = transactionResult.rows[0];

    if (!transaction) {
      return { failure: "NOT_PARTICIPANT" };
    }

    const isSeller = Number(transaction.seller_idx) === Number(reviewerIdx);
    const isBuyer = Number(transaction.buyer_idx) === Number(reviewerIdx);

    if (!isSeller && !isBuyer) {
      return { failure: "NOT_PARTICIPANT" };
    }

    const expectedRevieweeIdx = Number(
      isSeller ? transaction.buyer_idx : transaction.seller_idx,
    );

    if (expectedRevieweeIdx !== Number(revieweeIdx)) {
      return { failure: "INVALID_REVIEWEE" };
    }

    if (transaction.status !== "COMPLETED") {
      return { failure: "NOT_COMPLETED" };
    }

    const duplicate = await client.query(
      `
        SELECT idx
        FROM reviews
        WHERE transaction_idx = $1
          AND reviewer_idx = $2
      `,
      [transactionIdx, reviewerIdx],
    );

    if (duplicate.rows[0]) {
      return { failure: "DUPLICATE" };
    }

    const reviewResult = await client.query(
      `
        INSERT INTO reviews (
          transaction_idx,
          reviewer_idx,
          reviewee_idx,
          rating,
          content
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING idx, created_at
      `,
      [transactionIdx, reviewerIdx, revieweeIdx, rating, content],
    );
    const review = reviewResult.rows[0];

    const notificationResult = await client.query(
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
          'NEW_REVIEW',
          'REVIEW',
          $2,
          '새로운 후기가 도착했습니다.'
        )
        RETURNING
          idx AS "notificationIdx",
          receiver_idx AS "receiverIdx",
          notification_type AS "notificationType",
          reference_type AS "referenceType",
          reference_idx AS "referenceIdx",
          content,
          is_read AS "isRead",
          created_at AS "createdAt"
      `,
      [revieweeIdx, review.idx],
    );

    return {
      review,
      notification: notificationResult.rows[0],
    };
  });
}

export async function findReceivedReviews({
  userIdx,
  type,
  page,
  limit,
  offset,
}) {
  const values = [userIdx, type, limit, offset];
  const roleExpression = `CASE
    WHEN tx.buyer_idx = review.reviewer_idx THEN 'BUYER_REVIEW'
    ELSE 'SELLER_REVIEW'
  END`;
  const where = `review.reviewee_idx = $1
    AND ($2 = 'ALL' OR ${roleExpression} = $2)`;

  const [items, count] = await Promise.all([
    query(
      `
        SELECT
          review.idx AS "reviewIdx",
          review.transaction_idx AS "transactionIdx",
          review.reviewer_idx AS "reviewerIdx",
          reviewer.nickname AS "reviewerNickname",
          reviewer.profile_image AS "reviewerProfileImageUrl",
          review.rating,
          review.content,
          listing.idx AS "listingIdx",
          listing.title AS "listingTitle",
          ${roleExpression} AS "reviewType",
          review.created_at AS "createdAt"
        FROM reviews review
        JOIN transactions tx
          ON tx.idx = review.transaction_idx
        JOIN listings listing ON listing.idx = tx.listing_idx
        JOIN users reviewer ON reviewer.idx = review.reviewer_idx
        WHERE ${where}
        ORDER BY review.created_at DESC, review.idx DESC
        LIMIT $3 OFFSET $4
      `,
      values,
    ),
    query(
      `
        SELECT COUNT(*)::int AS count
        FROM reviews review
        JOIN transactions tx
          ON tx.idx = review.transaction_idx
        WHERE ${where}
      `,
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
