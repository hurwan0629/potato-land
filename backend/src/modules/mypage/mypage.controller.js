import { notImplemented } from "../../common/utils/notImplemented.js";

export function listMyListings(req, res) {
  // TODO: list current user's non-deleted listings.
  return notImplemented(res, "내 판매상품 조회");
}

export function listMyFavorites(req, res) {
  // TODO: list current user's favorites excluding deleted listings.
  return notImplemented(res, "내 관심목록 조회");
}

export function listMyHistory(req, res) {
  // TODO: list current user's transaction history with deleted listing snapshots.
  return notImplemented(res, "내 거래내역 조회");
}

export function listMyReviews(req, res) {
  // TODO: list reviews related to current user.
  return notImplemented(res, "내 후기 조회");
}

export function listUserListings(req, res) {
  // TODO: list target user's public non-deleted listings.
  return notImplemented(res, "외부 프로필 판매상품 조회");
}

export function listUserMypageReviews(req, res) {
  // TODO: list target user's public reviews for mypage view.
  return notImplemented(res, "외부 프로필 후기 조회");
}
