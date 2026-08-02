import { notImplemented } from "../../common/utils/notImplemented.js";

export function listAuctions(req, res) {
  // TODO: list/search auction listings by query and exclude deleted listings.
  return notImplemented(res, "경매 목록 조회");
}

export function createAuction(req, res) {
  // TODO: create listing/auction post/images and register auction timer.
  return notImplemented(res, "경매글 등록");
}

export function getAuctionDetail(req, res) {
  // TODO: read auction detail, DB status, optional Redis current bid state.
  return notImplemented(res, "경매 상세 조회");
}

export function updateAuction(req, res) {
  // TODO: verify owner/admin and update auction listing fields/images.
  return notImplemented(res, "경매글 수정");
}

export function deleteAuction(req, res) {
  // TODO: soft delete auction, delete favorites, notify bidders, clear timer/state.
  return notImplemented(res, "경매글 삭제");
}

export function createAuctionBid(req, res) {
  // TODO: validate bid, update Redis state atomically, persist bid, emit socket events.
  return notImplemented(res, "경매 입찰");
}

export function listAuctionBids(req, res) {
  // TODO: read auction bid history from DB.
  return notImplemented(res, "경매 입찰 내역 조회");
}

export function addAuctionFavorite(req, res) {
  // TODO: add favorite for active user and non-deleted auction listing.
  return notImplemented(res, "경매 관심 추가");
}

export function removeAuctionFavorite(req, res) {
  // TODO: remove auction favorite for current user.
  return notImplemented(res, "경매 관심 해제");
}
