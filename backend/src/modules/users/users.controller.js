import { notImplemented } from "../../common/utils/notImplemented.js";

export function getUserProfile(req, res) {
  // TODO: 대상 사용자의 공개 프로필, 완료 판매/구매 수, 평균 평점, 받은 후기 수를 조회하고 비활성 사용자 표시 정책을 적용한다.
  return notImplemented(res, "사용자 공개 프로필 조회");
}

export function getMyProfile(req, res) {
  // TODO: 로그인 사용자의 개인정보와 공개 프로필 통계를 함께 조회하되 password hash 등 내부 값은 제외한다.
  return notImplemented(res, "내 프로필 조회");
}

export function updateMyProfile(req, res) {
  // TODO 처리 순서:
  // 1. 로그인 사용자를 확인하고 bio 및 선택 이미지 파일을 검증한다.
  // 2. 새 이미지 저장과 users.profile_image/bio 갱신을 처리한다.
  // 3. commit 후 교체된 이전 이미지 파일을 정리하고 공개 프로필 DTO를 반환한다.
  return notImplemented(res, "내 공개 프로필 수정");
}

export function verifyMyPassword(req, res) {
  // TODO: access token의 사용자 비밀번호를 확인하고 10분짜리 회원정보 수정 verificationToken을 발급한다.
  return notImplemented(res, "내 정보 수정 전 비밀번호 확인");
}

export function updateMe(req, res) {
  // TODO 처리 순서:
  // 1. verificationToken과 선택 입력값을 검증한다.
  // 2. nickname/email 중복을 확인하고 phone 변경이면 CHANGE_PHONE 인증 ID를 확인한다.
  // 3. newPassword가 있으면 확인값과 정책을 검증해 hash한다.
  // 4. 하나의 transaction에서 변경하고 commit 후 사용한 인증 key와 수정 token을 폐기한다.
  return notImplemented(res, "내 정보 수정");
}

export function withdrawMe(req, res) {
  // TODO 처리 순서:
  // 1. 로그인 사용자와 비밀번호를 확인한다.
  // 2. users.deleted_at, 소유 listing 삭제, REQUESTED 거래 취소를 한 transaction에서 처리한다.
  // 3. 탈퇴 사용자의 경매 입찰을 제외해 최고 입찰자를 재계산한다.
  // 4. commit 후 모든 session, Timer/Redis 상태를 정리하고 관련 사용자에게 알림을 보낸다.
  return notImplemented(res, "회원 탈퇴");
}
