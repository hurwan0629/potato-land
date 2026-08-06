import { AppError } from "../../common/errors/AppError.js";
import {
  findFavoritesByUser,
  findHistoryByUser,
  findListingsBySeller,
  findReviewsRelatedToUser,
} from "./mypage.repository.js";

function positiveInt(value, field) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "요청 정보를 확인해주세요.", details: { field } });
  }
  return result;
}

function paging(query = {}, defaultLimit = 10) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? defaultLimit);
  if (!Number.isSafeInteger(page) || page <= 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "페이지 조건을 확인해주세요." });
  }
  return { page, limit, offset: (page - 1) * limit };
}

function listingFilters(query = {}) {
  const type = String(query.type ?? "ALL").toUpperCase();
  const status = query.status ? String(query.status).toUpperCase() : null;
  if (!["ALL", "USED", "AUCTION"].includes(type)) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "상품 유형을 확인해주세요.", details: { field: "type" } });
  }
  return { type, status };
}

function paged(result, page, limit) {
  return { items: result.rows, page, limit, totalCount: result.totalCount, totalPages: Math.ceil(result.totalCount / limit) };
}

export async function listMyListings(userIdx, query) {
  const pagination = paging(query, 5);
  const filters = listingFilters(query);
  return paged(await findListingsBySeller({ sellerIdx: userIdx, ...filters, ...pagination }), pagination.page, pagination.limit);
}

export async function listMyFavorites(userIdx, query) {
  const pagination = paging(query, 16);
  const filters = listingFilters(query);
  return paged(await findFavoritesByUser({ userIdx, ...filters, ...pagination }), pagination.page, pagination.limit);
}

export async function listUserListings(userIdxValue, query) {
  const sellerIdx = positiveInt(userIdxValue, "userIdx");
  const pagination = paging(query, 5);
  const filters = listingFilters(query);
  return paged(await findListingsBySeller({ sellerIdx, ...filters, ...pagination }), pagination.page, pagination.limit);
}

export async function listMyHistory(userIdx, query = {}) {
  const pagination = paging(query, 10);
  const type = String(query.type ?? "ALL").toUpperCase();
  const status = query.status ? String(query.status).toUpperCase() : null;
  const q = typeof query.q === "string" ? query.q.trim() : "";
  if (!["ALL", "SELL", "BUY", "AUCTION_BID"].includes(type)) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "거래내역 유형을 확인해주세요.", details: { field: "type" } });
  }
  return paged(await findHistoryByUser({ userIdx, type, status, q, ...pagination }), pagination.page, pagination.limit);
}

export async function listMyReviews(userIdx, query = {}) {
  const pagination = paging(query, 9);
  const direction = String(query.direction ?? "RECEIVED").toUpperCase();
  const type = String(query.type ?? "ALL").toUpperCase();
  if (!["RECEIVED", "WRITTEN"].includes(direction) || !["ALL", "BUYER_REVIEW", "SELLER_REVIEW"].includes(type)) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "후기 조회 조건을 확인해주세요." });
  }
  return paged(await findReviewsRelatedToUser({ userIdx, direction, type, ...pagination }), pagination.page, pagination.limit);
}
