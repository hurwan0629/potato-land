import { notImplemented } from "../../common/utils/notImplemented.js";

export function listReviewTags(req, res) {
  // TODO: 활성 후기 태그를 STRENGTH/WEAKNESS로 나눠 sort_order 순서로 반환한다.
  return notImplemented(res, "후기 태그 목록 조회");
}

export function createReview(req, res) {
  // TODO: 완료 거래 참여자와 중복 작성을 확인하고 rating/content/선택 태그를 transaction으로 저장한 뒤 피평가자에게 알린다.
  return notImplemented(res, "후기 작성");
}

export function listUserReviews(req, res) {
  // TODO: 대상 사용자가 받은 후기를 reviewer 정보, 거래 상품, reviewerRole과 함께 페이지네이션해 반환한다.
  return notImplemented(res, "사용자 후기 목록 조회");
}
