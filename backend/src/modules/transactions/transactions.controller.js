import { notImplemented } from "../../common/utils/notImplemented.js";

export function createPaymentRequest(req, res) {
  // TODO: seller creates REQUESTED transaction and PAYMENT_REQUEST chat message.
  return notImplemented(res, "송금 요청 생성");
}

export function getTransaction(req, res) {
  // TODO: read transaction detail for buyer/seller.
  return notImplemented(res, "거래 상세 조회");
}

export function completeTransaction(req, res) {
  // TODO: buyer completes REQUESTED transaction.
  return notImplemented(res, "송금 완료");
}

export function cancelTransaction(req, res) {
  // TODO: seller cancels REQUESTED transaction with status CANCELED.
  return notImplemented(res, "송금 요청 취소");
}
