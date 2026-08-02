import { notImplemented } from "../../common/utils/notImplemented.js";

export function listUsed(req, res) {
  // TODO: list/search used listings by query and exclude deleted listings.
  return notImplemented(res, "중고글 목록 조회");
}

export function createUsed(req, res) {
  // TODO: create listing, used post, and post images in a DB transaction.
  return notImplemented(res, "중고글 등록");
}

export function getUsedDetail(req, res) {
  // TODO: read used listing detail and return 404 for deleted listing.
  return notImplemented(res, "중고글 상세 조회");
}

export function updateUsed(req, res) {
  // TODO: verify owner/admin and update used listing fields/images.
  return notImplemented(res, "중고글 수정");
}

export function deleteUsed(req, res) {
  // TODO: soft delete listing and delete related favorites.
  return notImplemented(res, "중고글 삭제");
}

export function addUsedFavorite(req, res) {
  // TODO: verify active user and add favorite for non-deleted used listing.
  return notImplemented(res, "중고글 관심 추가");
}

export function removeUsedFavorite(req, res) {
  // TODO: remove favorite for current user and listing.
  return notImplemented(res, "중고글 관심 해제");
}
