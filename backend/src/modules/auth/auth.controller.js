import { notImplemented } from "../../common/utils/notImplemented.js";

export function signup(req, res) {
  // TODO 처리 순서:
  // 1. 비회원 요청인지 확인하고 회원가입 입력값을 검증한다.
  // 2. phone:verified:{phone}:SIGNUP의 인증 ID가 요청값과 같은지 확인한다.
  // 3. 아이디, 닉네임, 전화번호, 이메일 중복을 DB에서 다시 확인한다.
  // 4. 비밀번호를 hash한 뒤 사용자를 저장하고 commit 후 인증 key를 삭제한다.
  return notImplemented(res, "회원가입");
}

export function checkLoginId(req, res) {
  // TODO: loginId 형식을 검증하고 users.login_id 중복 여부를 반환한다.
  return notImplemented(res, "아이디 중복 확인");
}

export function sendPhoneCode(req, res) {
  // TODO 처리 순서:
  // 1. phone과 purpose를 검증하고 purpose에 맞는 접근 권한과 중복 정책을 적용한다.
  // 2. cooldown key가 있으면 429를 반환한다.
  // 3. SMS 발송 성공 후 code hash, 인증 ID, 만료 시각과 cooldown을 Redis에 저장한다.
  return notImplemented(res, "전화번호 인증번호 발송");
}

export function verifyPhoneCode(req, res) {
  // TODO: Redis의 code hash와 요청 code를 비교하고 성공하면 code key를 지운 뒤 verified key를 저장한다.
  return notImplemented(res, "전화번호 인증번호 검증");
}

export function getPhoneStatus(req, res) {
  // TODO: phone, purpose, phoneVerificationId를 검증하고 verified key의 일치 여부와 남은 시간을 반환한다.
  return notImplemented(res, "전화번호 인증 상태 조회");
}

export function login(req, res) {
  // TODO 처리 순서:
  // 1. 비회원 요청과 아이디/비밀번호 형식을 확인한다.
  // 2. DB 사용자 상태와 비밀번호 hash를 검증한다.
  // 3. 같은 sid를 공유하는 access/refresh token과 서로 다른 jti를 만든다.
  // 4. refresh jti를 Redis session에 저장하고 두 HttpOnly cookie를 설정한다.
  return notImplemented(res, "로그인");
}

export function logout(req, res) {
  // TODO: refresh cookie에서 sub/sid를 확인해 현재 Redis session만 삭제하고 두 cookie를 만료시킨다.
  return notImplemented(res, "로그아웃");
}

export function refresh(req, res) {
  // TODO: refresh JWT와 Redis의 현재 jti를 비교하고 새 access/refresh jti로 원자 교체한 뒤 cookie를 재발급한다.
  return notImplemented(res, "토큰 재발급");
}

export function getMe(req, res) {
  // TODO: access token과 DB 사용자 상태를 검증하고 헤더에서 사용할 최소 인증 사용자 DTO를 반환한다.
  return notImplemented(res, "내 인증 정보 조회");
}

export function findLoginId(req, res) {
  // TODO: 이름과 전화번호가 같은 사용자를 찾고 FIND_ID verified key가 일치하면 loginId만 반환한 뒤 key를 삭제한다.
  return notImplemented(res, "아이디 찾기");
}

export function resetPassword(req, res) {
  // TODO: 이름/아이디/전화번호와 RESET_PASSWORD verified key를 검증하고 새 비밀번호 hash를 저장한 뒤 key와 기존 session을 폐기한다.
  return notImplemented(res, "비밀번호 재설정");
}
