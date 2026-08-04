import { notImplemented } from "../../common/utils/notImplemented.js";

export function getDashboard(req, res) {
  // TODO: 관리자를 확인하고 from/to/interval에 따라 활성 회원, 비삭제 글, 완료 거래 수/금액과 시계열 집계를 반환한다.
  return notImplemented(res, "관리자 대시보드");
}

export function listUsers(req, res) {
  // TODO: 관리자를 확인하고 email/nickname/name 통합 검색, 상태, page/limit으로 회원 관리 카드 DTO를 반환한다.
  return notImplemented(res, "관리자 회원 목록 조회");
}

export function getUser(req, res) {
  // TODO: 관리자를 확인하고 회원 개인정보 allowlist, 거래/후기 요약, 최근 preview와 adminMemo를 반환한다.
  return notImplemented(res, "관리자 회원 상세 조회");
}

export function banUser(req, res) {
  // TODO: 관리자 본인 정지를 막고 대상 사용자를 영구정지한 뒤 session을 폐기하고 진행 상태를 안전하게 정리·알림한다.
  return notImplemented(res, "관리자 회원 영구정지");
}

export function updateUserMemo(req, res) {
  // TODO: 관리자를 확인하고 memo 길이를 검증해 users.admin_memo를 갱신한다.
  return notImplemented(res, "관리자 회원 메모 수정");
}

export function listUsedForAdmin(req, res) {
  // TODO: 관리자를 확인하고 상품명/판매자 아이디 검색과 page/limit을 적용해 구매자·완료 거래 정보를 포함한 중고 관리 DTO를 반환한다.
  return notImplemented(res, "관리자 중고글 목록 조회");
}

export function deleteUsedForAdmin(req, res) {
  // TODO: 관리자를 확인하고 deleteReason과 함께 중고 listing을 논리 삭제하되 거래/채팅/후기 이력은 보존한다.
  return notImplemented(res, "관리자 중고글 삭제");
}

export function listAuctionsForAdmin(req, res) {
  // TODO: 관리자를 확인하고 상품명/판매자 아이디/listingIdx 검색과 파생 displayStatus를 포함한 경매 관리 DTO를 반환한다.
  return notImplemented(res, "관리자 경매 목록 조회");
}

export function deleteAuctionForAdmin(req, res) {
  // TODO: 관리자를 확인하고 경매를 논리 삭제한 뒤 Timer/Redis 상태를 정리하고 입찰자에게 알림과 auction:deleted를 보낸다.
  return notImplemented(res, "관리자 경매 삭제");
}

export function listAuctionWinners(req, res) {
  // TODO: 관리자를 확인하고 종료 경매의 판매자/낙찰자/최종가/낙찰 시각을 페이지네이션해 반환한다.
  return notImplemented(res, "관리자 경매 낙찰자 조회");
}

export function listUserTransactionsForAdmin(req, res) {
  // TODO: 관리자를 확인하고 대상 회원의 판매/구매/경매 거래 활동을 page/limit으로 조회한다.
  return notImplemented(res, "관리자 회원 거래 활동 조회");
}

export function listUserReviewsForAdmin(req, res) {
  // TODO: 관리자를 확인하고 대상 회원이 작성하거나 받은 후기를 page/limit으로 조회한다.
  return notImplemented(res, "관리자 회원 후기 활동 조회");
}
