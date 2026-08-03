import { notImplemented } from "../../common/utils/notImplemented.js";

export function createPaymentRequest(req, res) {
  // TODO: 판매자/구매자/listing/금액을 검증하고 REQUESTED 거래와 PAYMENT_REQUEST 메시지를 transaction으로 만든 뒤 구매자에게 알린다.
  return notImplemented(res, "송금 요청 생성");
}

export function getTransaction(req, res) {
  // TODO: 거래 참여자를 확인하고 listing/category/가격 및 상대 사용자 정보를 포함한 송금 확인 DTO를 반환한다.
  return notImplemented(res, "거래 상세 조회");
}

export function completeTransaction(req, res) {
  // TODO: 구매자와 REQUESTED 상태를 확인하고 COMPLETED, 중고 SOLD, TRADE_COMPLETE 메시지와 판매자 알림을 한 transaction에서 처리한다.
  return notImplemented(res, "송금 완료");
}

export function cancelTransaction(req, res) {
  // TODO: 판매자와 REQUESTED 상태를 확인하고 CANCELED로 변경한 뒤 구매자 알림을 저장·전송한다.
  return notImplemented(res, "송금 요청 취소");
}
