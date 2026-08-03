import { notImplemented } from "../../common/utils/notImplemented.js";

export function listMyListings(req, res) {
  // TODO: type/status/page/limit을 검증하고 내 삭제되지 않은 등록 상품을 완료 시각과 함께 조회한다.
  return notImplemented(res, "내 판매상품 조회");
}

export function listMyFavorites(req, res) {
  // TODO: type/page/limit을 검증하고 삭제되지 않은 관심 상품을 공통 목록 DTO로 조회한다.
  return notImplemented(res, "내 관심목록 조회");
}

export function listMyHistory(req, res) {
  // TODO: 완료 거래와 진행 중 입찰 경매를 합쳐 historyKind/myRole/status/displayDate가 있는 통합 거래내역 DTO로 반환한다.
  return notImplemented(res, "내 거래내역 조회");
}

export function listMyReviews(req, res) {
  // TODO: 작성/수신 방향과 판매자/구매자 역할 필터를 적용해 내 관련 후기를 페이지네이션한다.
  return notImplemented(res, "내 후기 조회");
}

export function listUserListings(req, res) {
  // TODO: 대상 사용자의 삭제되지 않은 판매 상품만 공개 목록 DTO로 페이지네이션한다.
  return notImplemented(res, "외부 프로필 판매상품 조회");
}
