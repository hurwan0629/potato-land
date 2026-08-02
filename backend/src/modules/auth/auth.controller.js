import { notImplemented } from "../../common/utils/notImplemented.js";

export function signup(req, res) {
  // TODO: validate signup body, consume phone verified key, create user without login.
  return notImplemented(res, "회원가입");
}

export function checkLoginId(req, res) {
  // TODO: validate loginId query and check users.login_id duplication.
  return notImplemented(res, "아이디 중복 확인");
}

export function sendPhoneCode(req, res) {
  // TODO: validate phone/purpose, save phone code hash in Redis, send SMS.
  return notImplemented(res, "전화번호 인증번호 발송");
}

export function verifyPhoneCode(req, res) {
  // TODO: verify phone code hash and create phone verified Redis key.
  return notImplemented(res, "전화번호 인증번호 검증");
}

export function getPhoneStatus(req, res) {
  // TODO: read phone verified status by phone/purpose.
  return notImplemented(res, "전화번호 인증 상태 조회");
}

export function login(req, res) {
  // TODO: verify credentials, create access/refresh cookies and Redis session.
  return notImplemented(res, "로그인");
}

export function logout(req, res) {
  // TODO: delete refresh session and expire access/refresh cookies.
  return notImplemented(res, "로그아웃");
}

export function refresh(req, res) {
  // TODO: verify refresh token, rotate Redis session jti, issue new cookies.
  return notImplemented(res, "토큰 재발급");
}

export function getMe(req, res) {
  // TODO: read current active user from access token.
  return notImplemented(res, "내 인증 정보 조회");
}

export function findLoginId(req, res) {
  // TODO: consume FIND_ID phone verification and return loginId.
  return notImplemented(res, "아이디 찾기");
}

export function resetPassword(req, res) {
  // TODO: consume RESET_PASSWORD phone verification and update password hash.
  return notImplemented(res, "비밀번호 재설정");
}
