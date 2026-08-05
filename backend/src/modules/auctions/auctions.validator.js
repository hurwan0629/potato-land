import { AppError } from "../../common/errors/AppError.js";

const PRODUCT_STATUSES = new Set(["NEW", "LIKE_NEW", "USED", "DAMAGED"]);
const AUCTION_STATUSES = new Set(["ON_GOING", "FINISHED"]);
const SORTS = new Set(["LATEST", "ENDING_SOON", "PRICE_ASC", "PRICE_DESC"]);

/** 문자열 입력의 양쪽 공백을 제거한다. */
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** 양의 정수 식별자를 검증한다. */
export function validateListingIdx(value) {
  const listingIdx = Number(value);
  if (!Number.isSafeInteger(listingIdx) || listingIdx <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "올바른 경매 식별자가 필요합니다.", { field: "listingIdx" });
  }
  return listingIdx;
}

/** 경매 목록의 검색·정렬·페이지 조건을 검증한다. */
export function validateAuctionList(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 16);
  const categoryIdx = query.categoryIdx ? Number(query.categoryIdx) : null;
  const status = text(query.status).toUpperCase() || null;
  const sort = text(query.sort).toUpperCase() || "LATEST";

  if (!Number.isSafeInteger(page) || page <= 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, "VALIDATION_ERROR", "경매 목록 조회 조건이 올바르지 않습니다.");
  }
  if (categoryIdx !== null && (!Number.isSafeInteger(categoryIdx) || categoryIdx <= 0)) {
    throw new AppError(400, "VALIDATION_ERROR", "경매 목록 조회 조건이 올바르지 않습니다.");
  }
  if (status && !AUCTION_STATUSES.has(status)) {
    throw new AppError(400, "VALIDATION_ERROR", "경매 목록 조회 조건이 올바르지 않습니다.");
  }
  if (!SORTS.has(sort)) {
    throw new AppError(400, "VALIDATION_ERROR", "경매 목록 조회 조건이 올바르지 않습니다.");
  }

  return { q: text(query.q), categoryIdx, status, sort, page, limit, offset: (page - 1) * limit };
}

/** 경매 등록 입력과 이미지 개수를 검증한다. */
export function validateAuctionCreate(body = {}, files = []) {
  const data = {
    title: text(body.title),
    description: text(body.description),
    categoryIdx: Number(body.categoryIdx),
    productStatus: text(body.productStatus).toUpperCase(),
    startPrice: Number(body.startPrice),
    preferredTradeLocation: text(body.preferredTradeLocation) || null,
    files,
  };

  const invalid = [];
  if (!data.title || data.title.length > 200) invalid.push("title");
  if (!data.description) invalid.push("description");
  if (!Number.isSafeInteger(data.categoryIdx) || data.categoryIdx <= 0) invalid.push("categoryIdx");
  if (!PRODUCT_STATUSES.has(data.productStatus)) invalid.push("productStatus");
  if (!Number.isSafeInteger(data.startPrice) || data.startPrice < 0) invalid.push("startPrice");
  if (files.length > 4) invalid.push("images");
  if (invalid.length) throw new AppError(400, "VALIDATION_ERROR", "경매 정보를 확인해주세요.", { fields: invalid });
  return data;
}

/** 경매 수정 입력을 검증하고 변경 가능한 필드만 반환한다. */
export function validateAuctionUpdate(body = {}, files = []) {
  const immutableFields = ["startPrice", "currentPrice", "bidUnit", "startedAt", "endsAt"];
  const requestedImmutable = immutableFields.filter((field) => body[field] !== undefined);
  if (requestedImmutable.length) {
    throw new AppError(400, "IMMUTABLE_FIELD", "경매 조건은 수정할 수 없습니다.", { fields: immutableFields });
  }

  const data = {
    title: text(body.title),
    description: text(body.description),
    categoryIdx: Number(body.categoryIdx),
    productStatus: text(body.productStatus).toUpperCase(),
    preferredTradeLocation: text(body.preferredTradeLocation) || null,
    files,
  };
  const invalid = [];
  if (!data.title || data.title.length > 200) invalid.push("title");
  if (!data.description) invalid.push("description");
  if (!Number.isSafeInteger(data.categoryIdx) || data.categoryIdx <= 0) invalid.push("categoryIdx");
  if (!PRODUCT_STATUSES.has(data.productStatus)) invalid.push("productStatus");
  if (files.length > 4) invalid.push("images");
  if (invalid.length) throw new AppError(400, "VALIDATION_ERROR", "경매 정보를 확인해주세요.", { fields: invalid });
  return data;
}

/** 경매 삭제 사유를 정규화한다. */
export function validateAuctionDelete(body = {}) {
  const deleteReason = text(body.deleteReason) || "판매자가 직접 삭제";
  if (deleteReason.length > 500) throw new AppError(400, "VALIDATION_ERROR", "삭제 사유를 확인해주세요.", { field: "deleteReason" });
  return { deleteReason };
}
