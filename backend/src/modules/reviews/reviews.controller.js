import { notImplemented } from "../../common/utils/notImplemented.js";
import { withTransaction } from "../../infrastructure/database/database.js";
import { AppError } from "../../common/errors/AppError.js";

export function listReviewTags(req, res) {
  // TODO: 활성 후기 태그를 STRENGTH/WEAKNESS로 나눠 sort_order 순서로 반환한다.
  // (docs C-04 개정: review_tags 테이블 자체가 스키마에 없어서 태그 기능은
  // 이번 후기 작성 구현에서 제외함 - createReview는 rating/content만 처리)
  return notImplemented(res, "후기 태그 목록 조회");
}

export async function createReview(req, res, next) {
  // 후기 작성 (docs C-04 기준, 태그 기능은 제외하고 rating/content만 처리)
  if (!req.user) {
    return next(
      new AppError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      }),
    );
  }

  const { transactionIdx, revieweeIdx, rating, content } = req.body ?? {};

  const txIdx = Number(transactionIdx);
  const targetRevieweeIdx = Number(revieweeIdx);
  const reviewerIdx = req.user.idx;

  if (!Number.isInteger(txIdx) || txIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "유효하지 않은 거래입니다.",
        details: { field: "transactionIdx" },
      }),
    );
  }

  if (!Number.isInteger(targetRevieweeIdx) || targetRevieweeIdx <= 0) {
    return next(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "유효하지 않은 사용자입니다.",
        details: { field: "revieweeIdx" },
      }),
    );
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return next(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "별점은 1 이상 10 이하의 정수여야 합니다.",
        details: { field: "rating" },
      }),
    );
  }

  if (content !== undefined && content !== null) {
    if (typeof content !== "string" || content.length > 50) {
      return next(
        new AppError({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "후기 내용은 50자 이하여야 합니다.",
          details: { field: "content" },
        }),
      );
    }
  }

  const reviewContent = content ?? null;

  try {
    const review = await withTransaction(async (client) => {
      const txResult = await client.query(
        `SELECT idx, seller_idx, buyer_idx, status
         FROM transactions
         WHERE idx = $1
         FOR UPDATE`,
        [txIdx],
      );

      if (txResult.rows.length === 0) {
        throw new AppError({
          status: 403,
          code: "FORBIDDEN",
          message: "거래 참여자만 후기를 작성할 수 있습니다.",
        });
      }

      const transaction = txResult.rows[0];
      const isSeller = transaction.seller_idx === reviewerIdx;
      const isBuyer = transaction.buyer_idx === reviewerIdx;

      if (!isSeller && !isBuyer) {
        throw new AppError({
          status: 403,
          code: "FORBIDDEN",
          message: "거래 참여자만 후기를 작성할 수 있습니다.",
        });
      }

      const expectedRevieweeIdx = isSeller ? transaction.buyer_idx : transaction.seller_idx;

      if (expectedRevieweeIdx !== targetRevieweeIdx) {
        throw new AppError({
          status: 403,
          code: "FORBIDDEN",
          message: "거래 참여자만 후기를 작성할 수 있습니다.",
        });
      }

      if (transaction.status !== "COMPLETED") {
        throw new AppError({
          status: 409,
          code: "CONFLICT",
          message: "완료된 거래에만 후기를 작성할 수 있습니다.",
        });
      }

      const existingResult = await client.query(
        `SELECT idx FROM reviews WHERE transaction_idx = $1 AND reviewer_idx = $2`,
        [txIdx, reviewerIdx],
      );

      if (existingResult.rows.length > 0) {
        throw new AppError({
          status: 409,
          code: "CONFLICT",
          message: "이미 후기를 작성했습니다.",
        });
      }

      const insertResult = await client.query(
        `INSERT INTO reviews (transaction_idx, reviewer_idx, reviewee_idx, rating, content)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING idx, created_at`,
        [txIdx, reviewerIdx, targetRevieweeIdx, rating, reviewContent],
      );

      await client.query(
        `INSERT INTO notifications (receiver_idx, notification_type, reference_type, reference_idx, content)
         VALUES ($1, 'NEW_REVIEW', 'REVIEW', $2, '새로운 후기가 도착했습니다.')`,
        [targetRevieweeIdx, insertResult.rows[0].idx],
      );

      return insertResult.rows[0];
    });

    return res.status(201).json({
      success: true,
      data: {
        reviewIdx: review.idx,
        transactionIdx: txIdx,
        reviewerIdx,
        revieweeIdx: targetRevieweeIdx,
        rating,
        content: reviewContent,
        createdAt: review.created_at,
      },
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);

    return next(
      new AppError({
        status: 500,
        code: "CREATE_REVIEW_FAILED",
        message: "후기를 작성하는 중 오류가 발생했습니다.",
        cause: error,
        expose: false,
      }),
    );
  }
}
