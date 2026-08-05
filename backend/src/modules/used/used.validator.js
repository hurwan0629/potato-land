import { AppError } from "../../common/errors/AppError.js";

const PRODUCT_STATUSES = new Set(["NEW", "LIKE_NEW", "USED", "DAMAGED"]);
const TRADE_STATUSES = new Set(["ON_SALE", "SOLD"]);
const SORTS = new Set(["LATEST", "POPULAR", "PRICE_ASC", "PRICE_DESC"]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateListingIdx(value) {
  const listingIdx = Number(value);
  if (!Number.isSafeInteger(listingIdx) || listingIdx <= 0) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "올바른 상품 식별자가 필요합니다.", details: { field: "listingIdx" } });
  }
  return listingIdx;
}

export function validateUsedList(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 16);
  const categoryIdx = query.categoryIdx ? Number(query.categoryIdx) : null;
  const status = text(query.status).toUpperCase() || null;
  const sort = text(query.sort).toUpperCase() || "LATEST";

  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "중고 목록 조회 조건이 올바르지 않습니다." });
  }
  if (categoryIdx !== null && (!Number.isSafeInteger(categoryIdx) || categoryIdx <= 0)) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "카테고리를 확인해주세요.", details: { field: "categoryIdx" } });
  }
  if (status && !TRADE_STATUSES.has(status)) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "거래 상태를 확인해주세요.", details: { field: "status" } });
  }
  if (!SORTS.has(sort)) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "정렬 조건을 확인해주세요.", details: { field: "sort" } });
  }

  return { q: text(query.q), categoryIdx, status, sort, page, limit, offset: (page - 1) * limit };
}

function validateUsedBody(body = {}, files = [], { partial = false } = {}) {
  const data = {
    title: text(body.title),
    description: text(body.description),
    categoryIdx: Number(body.categoryIdx),
    productStatus: text(body.productStatus).toUpperCase(),
    price: Number(body.price),
    preferredTradeLocation: text(body.preferredTradeLocation) || null,
    files,
  };
  const invalid = [];
  if (!data.title || data.title.length > 200) invalid.push("title");
  if (!data.description) invalid.push("description");
  if (!Number.isSafeInteger(data.categoryIdx) || data.categoryIdx <= 0) invalid.push("categoryIdx");
  if (!PRODUCT_STATUSES.has(data.productStatus)) invalid.push("productStatus");
  if (!Number.isSafeInteger(data.price) || data.price < 0) invalid.push("price");
  if (files.length > 4) invalid.push("images");
  if (invalid.length) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: partial ? "수정할 상품 정보를 확인해주세요." : "등록할 상품 정보를 확인해주세요.", details: { fields: invalid } });
  }
  return data;
}

export function validateUsedCreate(body, files) {
  return validateUsedBody(body, files);
}

export function validateUsedUpdate(body, files) {
  if (body.tradeStatus !== undefined || body.listingType !== undefined) {
    throw new AppError({ status: 400, code: "IMMUTABLE_FIELD", message: "거래 상태와 상품 유형은 이 API에서 수정할 수 없습니다.", details: { fields: ["tradeStatus", "listingType"] } });
  }
  return validateUsedBody(body, files, { partial: true });
}

export function validateDeleteReason(body = {}) {
  const deleteReason = text(body.deleteReason) || "판매자가 직접 삭제";
  if (deleteReason.length > 500) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "삭제 사유를 확인해주세요.", details: { field: "deleteReason" } });
  }
  return deleteReason;
}
