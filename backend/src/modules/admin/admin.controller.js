import { notImplemented } from "../../common/utils/notImplemented.js";

export function getDashboard(req, res) {
  // TODO: verify admin and aggregate dashboard statistics.
  return notImplemented(res, "관리자 대시보드");
}

export function listUsers(req, res) {
  // TODO: verify admin and list users by query/status.
  return notImplemented(res, "관리자 회원 목록 조회");
}

export function getUser(req, res) {
  // TODO: verify admin and read user detail.
  return notImplemented(res, "관리자 회원 상세 조회");
}

export function banUser(req, res) {
  // TODO: verify admin and permanently ban user with deactivation flow.
  return notImplemented(res, "관리자 회원 영구정지");
}

export function updateUserMemo(req, res) {
  // TODO: verify admin and update admin memo.
  return notImplemented(res, "관리자 회원 메모 수정");
}

export function listUsedForAdmin(req, res) {
  // TODO: verify admin and list used posts for admin.
  return notImplemented(res, "관리자 중고글 목록 조회");
}

export function deleteUsedForAdmin(req, res) {
  // TODO: verify admin and soft delete used listing.
  return notImplemented(res, "관리자 중고글 삭제");
}

export function listAuctionsForAdmin(req, res) {
  // TODO: verify admin and list auctions for admin.
  return notImplemented(res, "관리자 경매 목록 조회");
}

export function deleteAuctionForAdmin(req, res) {
  // TODO: verify admin and soft delete auction with bidder notifications.
  return notImplemented(res, "관리자 경매 삭제");
}

export function listAuctionWinners(req, res) {
  // TODO: verify admin and list auction winners.
  return notImplemented(res, "관리자 경매 낙찰자 조회");
}
