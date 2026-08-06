import { AppError } from "../../common/errors/AppError.js";
import { emitNotificationNew, emitNotificationUnreadCount } from "../../sockets/emitters/notification.emitter.js";
import { findActiveReviewTags, findReceivedReviews, insertReview } from "./reviews.repository.js";

function positiveInt(value, field) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "요청 정보를 확인해주세요.", details: { field } });
  }
  return result;
}

function pageQuery(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 9);
  const type = typeof query.type === "string" ? query.type.toUpperCase() : "ALL";
  if (!Number.isSafeInteger(page) || page <= 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "페이지 조건을 확인해주세요." });
  }
  if (!["ALL", "BUYER_REVIEW", "SELLER_REVIEW"].includes(type)) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "후기 유형을 확인해주세요.", details: { field: "type" } });
  }
  return { page, limit, type, offset: (page - 1) * limit };
}

export async function listReviewTags() {
  const rows = await findActiveReviewTags();
  return {
    strength: rows.filter((row) => row.sentiment === "STRENGTH"),
    weakness: rows.filter((row) => row.sentiment === "WEAKNESS"),
  };
}

/**
 * 1. 요청 필드와 태그 ID를 검증한다.
 * 2. 거래 참여자·완료 상태·중복 여부를 transaction에서 확인한다.
 * 3. commit 후 개인 Socket room으로 새 알림과 미확인 개수를 전송한다.
 */
export async function createReview(reviewerIdx, body = {}) {
  const transactionIdx = positiveInt(body.transactionIdx, "transactionIdx");
  const revieweeIdx = positiveInt(body.revieweeIdx, "revieweeIdx");
  const rating = Number(body.rating);
  const content = body.content == null ? null : String(body.content).trim() || null;
  const rawTagIds = Array.isArray(body.tagIds) ? body.tagIds : [];
  const tagIds = [...new Set(rawTagIds.map((value) => positiveInt(value, "tagIds")))];

  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "별점은 1~10 정수여야 합니다.", details: { field: "rating" } });
  }
  if (content && content.length > 50) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "후기 내용은 50자 이하여야 합니다.", details: { field: "content" } });
  }
  if (tagIds.length > 5) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "후기 태그는 최대 5개까지 선택할 수 있습니다.", details: { field: "tagIds" } });
  }

  const result = await insertReview({ transactionIdx, reviewerIdx, revieweeIdx, rating, content, tagIds });
  const failures = {
    NOT_PARTICIPANT: [403, "FORBIDDEN", "거래 참여자만 후기를 작성할 수 있습니다."],
    INVALID_REVIEWEE: [403, "FORBIDDEN", "거래 상대방에게만 후기를 작성할 수 있습니다."],
    NOT_COMPLETED: [409, "CONFLICT", "완료된 거래에만 후기를 작성할 수 있습니다."],
    DUPLICATE: [409, "CONFLICT", "이미 후기를 작성했습니다."],
    INVALID_TAG: [400, "VALIDATION_ERROR", "사용할 수 없는 후기 태그가 포함되어 있습니다."],
  };
  if (result.failure) {
    const [status, code, message] = failures[result.failure];
    throw new AppError({ status, code, message });
  }

  emitNotificationNew(revieweeIdx, result.notification);
  emitNotificationUnreadCount(revieweeIdx, { unreadCount: result.unreadCount });

  return {
    reviewIdx: Number(result.review.idx), transactionIdx, reviewerIdx: Number(reviewerIdx),
    revieweeIdx, rating, content, tagIds, createdAt: result.review.created_at,
  };
}

export async function listReceivedReviews(userIdxValue, query) {
  const userIdx = positiveInt(userIdxValue, "userIdx");
  const paging = pageQuery(query);
  const result = await findReceivedReviews({ userIdx, ...paging });
  return {
    items: result.rows,
    page: result.page,
    limit: result.limit,
    totalCount: result.totalCount,
    totalPages: Math.ceil(result.totalCount / result.limit),
  };
}
