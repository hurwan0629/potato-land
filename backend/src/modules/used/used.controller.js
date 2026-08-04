import { notImplemented } from "../../common/utils/notImplemented.js";

export function listUsed(req, res) {
  // TODO: q/categoryIdx/status/sort/page/limit을 검증하고 삭제되지 않은 중고글을 ListingSummary DTO로 조회한다.
  return notImplemented(res, "중고글 목록 조회");
}

export function createUsed(req, res) {
  // TODO: 로그인/입력/이미지 최대 4장을 검증하고 listings, used_posts, post_images를 한 transaction에서 저장한다.
  return notImplemented(res, "중고글 등록");
}

export function getUsedDetail(req, res) {
  // TODO: 삭제되지 않은 중고글, 이미지, category, seller 통계를 조회하고 optional 사용자 기준 viewer 권한을 계산한다.
  return notImplemented(res, "중고글 상세 조회");
}

export function updateUsed(req, res) {
  // TODO: 판매자 본인과 ON_SALE 상태를 확인하고 공통 상품 필드/가격/이미지를 transaction으로 수정한다.
  return notImplemented(res, "중고글 수정");
}

export function deleteUsed(req, res) {
  // TODO: 판매자 본인을 확인하고 listings를 논리 삭제한 뒤 favorites를 제거하며 기존 거래/채팅 이력은 보존한다.
  return notImplemented(res, "중고글 삭제");
}

export function addUsedFavorite(req, res) {
  // TODO: 로그인 사용자와 삭제되지 않은 타인 중고글을 확인하고 favorites에 중복 없이 추가한다.
  return notImplemented(res, "중고글 관심 추가");
}

export function removeUsedFavorite(req, res) {
  // TODO: 현재 사용자의 favorites 행을 멱등하게 제거하고 최신 favoriteCount를 반환한다.
  return notImplemented(res, "중고글 관심 해제");
}
