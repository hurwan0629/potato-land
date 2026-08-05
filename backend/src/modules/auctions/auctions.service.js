import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { cancelAuctionEnd, scheduleAuctionEnd } from "../../schedulers/auctionTimer.js";
import { getAuthenticatedUser } from "../auth/auth.service.js";
import {
  findAuctionDetail,
  findAuctionForMutation,
  findAuctions,
  finishAuction,
  increaseAuctionViewCount,
  insertAuction,
  softDeleteAuction,
  updateAuctionRecord,
} from "./auctions.repository.js";
import {
  validateAuctionCreate,
  validateAuctionDelete,
  validateAuctionList,
  validateAuctionUpdate,
  validateListingIdx,
} from "./auctions.validator.js";

const log = logger.child("auction-service");

/** 업로드된 Multer 파일을 정적 리소스 URL 목록으로 변환한다. */
function imageUrls(files) {
  return files.map((file) => `/resources/listings/${file.filename}`);
}

/** DB 숫자와 날짜를 API 응답 형식으로 변환한다. */
function listItem(row) {
  return {
    listingIdx: Number(row.idx),
    listingType: "AUCTION",
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    category: { categoryIdx: Number(row.category_idx), name: row.category_name },
    startPrice: Number(row.start_price),
    currentPrice: Number(row.current_price),
    displayPrice: Number(row.current_price),
    status: row.status,
    bidCount: Number(row.bid_count),
    favoriteCount: Number(row.favorite_count),
    startedAt: row.started_at,
    endsAt: row.ends_at,
    hasMyBid: false,
    myBidAmount: null,
  };
}

/** 검색 조건에 맞는 경매 목록 DTO를 반환한다. */
export async function getAuctions(query) {
  const data = validateAuctionList(query);
  const result = await findAuctions(data);
  return {
    items: result.rows.map(listItem),
    page: data.page,
    limit: data.limit,
    totalCount: result.totalCount,
    totalPages: Math.ceil(result.totalCount / data.limit),
  };
}

/** 경매 상품을 생성하고 24시간 종료 타이머를 등록한다. */
export async function createAuction(userIdx, body, files = []) {
  // 토큰 발급 이후 계정이 정지·탈퇴됐을 수 있으므로 DB의 현재 계정 상태를 다시 확인한다.
  const user = await getAuthenticatedUser(userIdx);
  const data = validateAuctionCreate(body, files);
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000);
  const bidUnit = 1000;
  let listingIdx;
  try {
    listingIdx = await insertAuction({
      sellerIdx: user.userIdx,
      ...data,
      imageUrls: imageUrls(files),
      startedAt,
      endsAt,
      bidUnit,
    });
  } catch (error) {
    if (error.code === "23503") throw new AppError(400, "VALIDATION_ERROR", "카테고리를 확인해주세요.", { field: "categoryIdx" });
    throw error;
  }

  scheduleAuctionEnd(listingIdx, endsAt, finishAuction);
  return {
    listingIdx: Number(listingIdx),
    listingType: "AUCTION",
    status: "ON_GOING",
    startPrice: data.startPrice,
    currentPrice: data.startPrice,
    startedAt,
    endsAt,
  };
}

/** 경매 상세 DTO를 조회하고 조회수를 증가시킨다. */
export async function getAuction(listingIdxValue, viewerUserIdx = null) {
  const listingIdx = validateListingIdx(listingIdxValue);
  const auction = await findAuctionDetail(listingIdx);
  if (!auction) throw new AppError(404, "NOT_FOUND", "경매를 찾을 수 없습니다.");
  await increaseAuctionViewCount(listingIdx);

  const isOwner = viewerUserIdx !== null && Number(auction.seller_idx) === Number(viewerUserIdx);
  const ongoing = auction.status === "ON_GOING" && new Date(auction.ends_at).getTime() > Date.now();
  return {
    listingIdx,
    listingType: "AUCTION",
    title: auction.title,
    description: auction.description,
    category: { categoryIdx: Number(auction.category_idx), name: auction.category_name },
    productStatus: auction.product_status,
    preferredTradeLocation: auction.preferred_trade_location,
    startPrice: Number(auction.start_price),
    currentPrice: Number(auction.current_price),
    minNextBid: Number(auction.current_price) + Number(auction.bid_unit),
    status: ongoing ? auction.status : "FINISHED",
    startedAt: auction.started_at,
    endsAt: auction.ends_at,
    seller: {
      userIdx: Number(auction.seller_idx),
      nickname: auction.seller_nickname,
      profileImageUrl: auction.seller_profile_image,
      averageRating: null,
      reviewCount: 0,
    },
    highestBidder: auction.highest_bidder_idx ? {
      userIdx: Number(auction.highest_bidder_idx),
      nickname: auction.highest_bidder_nickname,
    } : null,
    images: auction.images.map((image) => ({ imageIdx: Number(image.idx), imageUrl: image.image_url, sortOrder: image.sort_order })),
    bidCount: Number(auction.bid_count),
    favoriteCount: Number(auction.favorite_count),
    viewer: {
      isOwner,
      isFavorite: false,
      canEdit: isOwner && ongoing,
      canDelete: isOwner,
      canBid: Boolean(viewerUserIdx) && !isOwner && ongoing,
      canChat: Boolean(viewerUserIdx) && !isOwner,
      canFavorite: Boolean(viewerUserIdx) && !isOwner,
    },
  };
}

/** 소유자와 진행 상태를 확인한 뒤 변경 가능한 경매 상품 정보만 수정한다. */
export async function updateAuction(userIdx, listingIdxValue, body, files = []) {
  const user = await getAuthenticatedUser(userIdx);
  const listingIdx = validateListingIdx(listingIdxValue);
  const data = validateAuctionUpdate(body, files);
  const auction = await findAuctionForMutation(listingIdx);
  if (!auction) throw new AppError(404, "NOT_FOUND", "경매를 찾을 수 없습니다.");
  if (Number(auction.seller_idx) !== Number(user.userIdx)) throw new AppError(403, "FORBIDDEN", "판매자만 수정할 수 있습니다.");
  if (auction.status !== "ON_GOING" || new Date(auction.ends_at).getTime() <= Date.now()) {
    throw new AppError(409, "AUCTION_CLOSED", "종료된 경매는 수정할 수 없습니다.");
  }
  const updatedAt = await updateAuctionRecord(listingIdx, data, imageUrls(files));
  return { listingIdx, updated: true, updatedAt };
}

/** 소유자 또는 관리자가 경매를 논리 삭제하고 실행 상태를 정리한다. */
export async function deleteAuction(user, listingIdxValue, body) {
  const activeUser = await getAuthenticatedUser(user.userIdx);
  const listingIdx = validateListingIdx(listingIdxValue);
  const { deleteReason } = validateAuctionDelete(body);
  const auction = await findAuctionForMutation(listingIdx);
  if (!auction) throw new AppError(404, "NOT_FOUND", "경매를 찾을 수 없습니다.");
  if (Number(auction.seller_idx) !== Number(activeUser.userIdx) && activeUser.role !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "판매자만 삭제할 수 있습니다.");
  }
  const deletedAt = await softDeleteAuction(listingIdx, activeUser.userIdx, deleteReason);
  cancelAuctionEnd(listingIdx);

  // DB 삭제 성공 이후 Redis 정리는 실패해도 사용자 응답을 되돌리지 않고 로그로 남긴다.
  try {
    const redis = getRedisClient();
    await redis.del([`auction:${listingIdx}:state`, `auction:${listingIdx}:bidders`]);
  } catch (error) {
    log.warn("삭제된 경매의 Redis 상태를 정리하지 못했습니다.", { error, listingIdx });
  }
  return { listingIdx, deleted: true, deletedAt, deletedBy: Number(activeUser.userIdx), notifiedBidderCount: 0 };
}
