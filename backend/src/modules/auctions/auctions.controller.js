import { notImplemented } from "../../common/utils/notImplemented.js";

export function listAuctions(req, res) {
  // TODO: q/categoryIdx/status/sort/page/limit을 검증하고 로그인 사용자의 참여 경매 우선순위를 적용해 목록 DTO를 반환한다.
  return notImplemented(res, "경매 목록 조회");
}

export function createAuction(req, res) {
  // TODO 처리 순서:
  // 1. 로그인 사용자, 공통 상품 입력, 이미지 최대 4장과 시작가를 검증하고 서버가 경매 기간을 결정한다.
  // 2. listings, auction_posts, post_images를 transaction으로 저장한다.
  // 3. commit 후 종료 Timer를 등록하고 생성된 경매 DTO를 반환한다.
  return notImplemented(res, "경매글 등록");
}

export function getAuctionDetail(req, res) {
  // TODO: DB 경매 원본과 Redis 현재 입찰 상태를 조회하고 seller/category/images/viewer 권한을 포함한 상세 DTO를 반환한다.
  return notImplemented(res, "경매 상세 조회");
}

export function updateAuction(req, res) {
  // TODO: 판매자 본인과 진행 상태를 확인하고 title/category/productStatus/description/location/images만 수정한다.
  // startPrice, currentPrice, bidUnit, startedAt, endsAt은 요청에 있어도 변경하지 않는다.
  return notImplemented(res, "경매글 수정");
}

export function deleteAuction(req, res) {
  // TODO: 경매를 논리 삭제하고 favorites를 제거한 뒤 commit 후 Timer/Redis 상태를 정리하고 입찰자에게 삭제 이벤트와 알림을 보낸다.
  return notImplemented(res, "경매글 삭제");
}

export function createAuctionBid(req, res) {
  // TODO: 사용자/경매/입찰가를 검증하고 동시성 제어 안에서 입찰 row와 현재가를 저장한 뒤 최고 입찰자 변경 이벤트를 보낸다.
  return notImplemented(res, "경매 입찰");
}

export function listAuctionBids(req, res) {
  // TODO: 최고가 기준 상위 5개 bids와 로그인 사용자의 최고 입찰 myBid를 별도로 조회해 반환한다.
  return notImplemented(res, "경매 입찰 내역 조회");
}

export function addAuctionFavorite(req, res) {
  // TODO: 진행 중이며 삭제되지 않은 타인 경매인지 확인하고 favorites에 중복 없이 추가한다.
  return notImplemented(res, "경매 관심 추가");
}

export function removeAuctionFavorite(req, res) {
  // TODO: 현재 사용자의 favorites 행을 멱등하게 제거하고 최신 favoriteCount를 반환한다.
  return notImplemented(res, "경매 관심 해제");
}
