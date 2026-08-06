import { AppError } from "../../common/errors/AppError.js";
import {
  addFavoriteRow,
  findUsedDetail,
  findUsedForMutation,
  findUsedListings,
  increaseViewCount,
  insertUsedListing,
  removeFavoriteRow,
  softDeleteUsed,
  updateUsedRecord,
} from "./used.repository.js";
import {
  validateDeleteReason,
  validateListingIdx,
  validateUsedCreate,
  validateUsedList,
  validateUsedUpdate,
} from "./used.validator.js";

function imageUrls(files) {
  return files.map((file) => file.resourceUrl);
}

function summaryDto(row) {
  return {
    listingIdx: Number(row.listingIdx),
    listingType: "USED",
    title: row.title,
    thumbnailUrl: row.thumbnailUrl,
    category: { categoryIdx: Number(row.categoryIdx), name: row.categoryName },
    price: Number(row.price),
    displayPrice: Number(row.price),
    tradeStatus: row.tradeStatus,
    status: row.tradeStatus,
    favoriteCount: Number(row.favoriteCount),
    isFavorite: Boolean(row.isFavorite),
    createdAt: row.createdAt,
  };
}

export async function listUsedListings(query, viewerUserIdx = null) {
  const condition = validateUsedList(query);
  const result = await findUsedListings(condition, viewerUserIdx);
  return {
    items: result.rows.map(summaryDto),
    page: condition.page,
    limit: condition.limit,
    totalCount: result.totalCount,
    totalPages: Math.ceil(result.totalCount / condition.limit),
  };
}

/**
 * 1. 인증 사용자는 middleware에서 현재 DB 상태까지 검증한다.
 * 2. 입력값과 이미지 최대 4장을 검증한다.
 * 3. listings, used_posts, post_images를 한 transaction으로 저장한다.
 */
export async function createUsedListing(userIdx, body, files) {
  const data = validateUsedCreate(body, files);
  try {
    const created = await insertUsedListing({ ...data, sellerIdx: userIdx, imageUrls: imageUrls(files) });
    return { listingIdx: Number(created.idx), listingType: "USED", tradeStatus: "ON_SALE", createdAt: created.created_at };
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "카테고리를 확인해주세요.", details: { field: "categoryIdx" } });
    }
    throw error;
  }
}

export async function getUsedListing(listingIdxValue, viewerUserIdx = null) {
  const listingIdx = validateListingIdx(listingIdxValue);
  const row = await findUsedDetail(listingIdx, viewerUserIdx);
  if (!row) throw new AppError({ status: 404, code: "NOT_FOUND", message: "중고 상품을 찾을 수 없습니다." });
  await increaseViewCount(listingIdx);
  const isOwner = viewerUserIdx !== null && Number(row.seller_idx) === Number(viewerUserIdx);
  const onSale = row.trade_status === "ON_SALE";
  return {
    listingIdx,
    listingType: "USED",
    title: row.title,
    description: row.description,
    category: { categoryIdx: Number(row.category_idx), name: row.category_name },
    productStatus: row.product_status,
    preferredTradeLocation: row.preferred_trade_location,
    price: Number(row.price),
    tradeStatus: row.trade_status,
    viewCount: Number(row.view_count) + 1,
    favoriteCount: Number(row.favorite_count),
    seller: {
      userIdx: Number(row.seller_idx),
      nickname: row.seller_nickname,
      profileImageUrl: row.seller_profile_image,
      averageRating: Number(row.seller_average_rating),
      reviewCount: Number(row.seller_review_count),
    },
    images: row.images.map((image) => ({ imageIdx: Number(image.idx), imageUrl: image.image_url, sortOrder: Number(image.sort_order) })),
    viewer: {
      isOwner,
      isFavorite: Boolean(row.is_favorite),
      canEdit: isOwner && onSale,
      canDelete: isOwner,
      canChat: Boolean(viewerUserIdx) && !isOwner && onSale,
      canFavorite: Boolean(viewerUserIdx) && !isOwner && onSale,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateUsedListing(userIdx, listingIdxValue, body, files) {
  const listingIdx = validateListingIdx(listingIdxValue);
  const data = validateUsedUpdate(body, files);
  const current = await findUsedForMutation(listingIdx);
  if (!current) throw new AppError({ status: 404, code: "NOT_FOUND", message: "중고 상품을 찾을 수 없습니다." });
  if (Number(current.seller_idx) !== Number(userIdx)) throw new AppError({ status: 403, code: "FORBIDDEN", message: "판매자만 수정할 수 있습니다." });
  if (current.trade_status !== "ON_SALE") throw new AppError({ status: 409, code: "CONFLICT", message: "판매 중인 상품만 수정할 수 있습니다." });
  const updatedAt = await updateUsedRecord(listingIdx, data, imageUrls(files));
  return { listingIdx, updated: true, updatedAt };
}

export async function deleteUsedListing(user, listingIdxValue, body) {
  const listingIdx = validateListingIdx(listingIdxValue);
  const current = await findUsedForMutation(listingIdx);
  if (!current) throw new AppError({ status: 404, code: "NOT_FOUND", message: "중고 상품을 찾을 수 없습니다." });
  if (Number(current.seller_idx) !== Number(user.userIdx) && user.role !== "ADMIN") {
    throw new AppError({ status: 403, code: "FORBIDDEN", message: "판매자만 삭제할 수 있습니다." });
  }
  const deletedAt = await softDeleteUsed(listingIdx, user.userIdx, validateDeleteReason(body));
  return { listingIdx, deleted: true, deletedAt, deletedBy: Number(user.userIdx) };
}

async function assertFavoriteTarget(userIdx, listingIdx) {
  const current = await findUsedForMutation(listingIdx);
  if (!current) throw new AppError({ status: 404, code: "NOT_FOUND", message: "중고 상품을 찾을 수 없습니다." });
  if (Number(current.seller_idx) === Number(userIdx)) throw new AppError({ status: 409, code: "CONFLICT", message: "본인 상품은 관심 등록할 수 없습니다." });
  if (current.trade_status !== "ON_SALE") throw new AppError({ status: 409, code: "CONFLICT", message: "판매 중인 상품만 관심 등록할 수 있습니다." });
}

export async function addUsedFavorite(userIdx, listingIdxValue) {
  const listingIdx = validateListingIdx(listingIdxValue);
  await assertFavoriteTarget(userIdx, listingIdx);
  return { listingIdx, favorited: true, favoriteCount: await addFavoriteRow(userIdx, listingIdx) };
}

export async function removeUsedFavorite(userIdx, listingIdxValue) {
  const listingIdx = validateListingIdx(listingIdxValue);
  const current = await findUsedForMutation(listingIdx);
  if (!current) throw new AppError({ status: 404, code: "NOT_FOUND", message: "중고 상품을 찾을 수 없습니다." });
  return { listingIdx, favorited: false, favoriteCount: await removeFavoriteRow(userIdx, listingIdx) };
}
