import { notImplemented } from "../../common/utils/notImplemented.js";

export function getUserProfile(req, res) {
  // TODO: read public profile and apply inactive user display policy.
  return notImplemented(res, "사용자 공개 프로필 조회");
}

export function getMyProfile(req, res) {
  // TODO: verify access token and read current user profile.
  return notImplemented(res, "내 프로필 조회");
}

export function updateMyProfileImage(req, res) {
  // TODO: save profile image via storage service and update bio/profile fields.
  return notImplemented(res, "내 프로필 이미지 수정");
}

export function verifyMyPassword(req, res) {
  // TODO: verify current password and issue member edit verification token.
  return notImplemented(res, "내 정보 수정 전 비밀번호 확인");
}

export function updateMe(req, res) {
  // TODO: verify member edit token, update nickname/email/phone.
  return notImplemented(res, "내 정보 수정");
}

export function updateMyPassword(req, res) {
  // TODO: verify member edit token and update password hash.
  return notImplemented(res, "내 비밀번호 변경");
}

export function withdrawMe(req, res) {
  // TODO: soft delete current user and run deactivation follow-up flow.
  return notImplemented(res, "회원 탈퇴");
}
