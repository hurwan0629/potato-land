import { AppError } from "../../common/errors/AppError.js";
import { findActiveCategories, findMainSections } from "./main.repository.js";

function parseLimit(value) {
  const limit = Number(value ?? 4);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "메인 목록 개수는 1~20 사이의 정수여야 합니다.",
      details: { field: "limit" },
    });
  }
  return limit;
}

function normalizeItem(row) {
  return {
    ...row,
    listingIdx: Number(row.listingIdx),
    category: {
      categoryIdx: Number(row.categoryIdx),
      name: row.categoryName,
    },
    displayPrice: Number(row.displayPrice),
    favoriteCount: Number(row.favoriteCount),
  };
}

/**
 * 1. limit을 검증한다.
 * 2. 인기 중고·인기 경매·최근 상품·마감 임박 경매를 병렬 조회한다.
 * 3. 공통 ListingSummary DTO와 serverTime을 반환한다.
 */
export async function getMainData(query) {
  const limit = parseLimit(query?.limit);
  const sections = await findMainSections(limit);
  return {
    usedPopular: sections.usedPopular.map(normalizeItem),
    auctionPopular: sections.auctionPopular.map(normalizeItem),
    recentListings: sections.recentListings.map(normalizeItem),
    auctionClosingSoon: sections.auctionClosingSoon.map(normalizeItem),
    serverTime: new Date().toISOString(),
  };
}

export async function getCategoriesData() {
  const items = await findActiveCategories();
  return { items: items.map((item) => ({ ...item, categoryIdx: Number(item.categoryIdx), sortOrder: Number(item.sortOrder) })) };
}
