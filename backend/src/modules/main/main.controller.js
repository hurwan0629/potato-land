import { notImplemented } from "../../common/utils/notImplemented.js";

export function getMain(req, res) {
  // TODO 처리 순서:
  // 1. optional access token이 있으면 사용자를 확인한다.
  // 2. query.limit을 검증하고 기본값 4를 적용한다.
  // 3. 인기 중고, 인기 경매, 최근 등록, 마감 임박 경매를 각각 조회한다.
  // 4. 네 목록과 serverTime을 Main DTO로 묶어 반환한다.
  return notImplemented(res, "메인 조회");
}

export function listCategories(req, res) {
  // TODO 처리 순서:
  // 1. categories에서 is_active=true인 행만 sort_order 순서로 조회한다.
  // 2. categoryIdx, name, sortOrder만 공개 DTO로 반환한다.
  return notImplemented(res, "카테고리 조회");
}
