import { notImplemented } from "../../common/utils/notImplemented.js";
import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { checkLoginIdAvailability, getAuthenticatedUser, loginUser, signupUser } from "./auth.service.js";
import { setLoginCookies } from "./auth.token.js";

/** 회원가입 요청을 처리하며 성공 후 자동 로그인은 수행하지 않는다. */
export const signup = asyncHandler(async (req, res) => {
  const user = await signupUser(req.body);
  return res.status(201).json({ success: true, data: user });
});

/** query의 loginId가 사용 가능한지 응답한다. */
export const checkLoginId = asyncHandler(async (req, res) => {
  const result = await checkLoginIdAvailability(req.query.loginId);
  return res.status(200).json({ success: true, data: result });
});

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

/** 로그인 자격 증명을 확인하고 access/refresh HttpOnly 쿠키를 발급한다. */
export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body, { userAgent: req.get("user-agent") ?? "", ip: req.ip });
  setLoginCookies(res, result.tokens);
  return res.status(200).json({ success: true, data: result.user });
});

export function logout(req, res) {
  // TODO: delete refresh session and expire access/refresh cookies.
  return notImplemented(res, "로그아웃");
}

export function refresh(req, res) {
  // TODO: verify refresh token, rotate Redis session jti, issue new cookies.
  return notImplemented(res, "토큰 재발급");
}

/** access token으로 식별한 현재 활성 사용자 정보를 응답한다. */
export const getMe = asyncHandler(async (req, res) => {
  const user = await getAuthenticatedUser(req.auth.userIdx);
  return res.status(200).json({ success: true, data: user });
});

export function findLoginId(req, res) {
  // TODO: consume FIND_ID phone verification and return loginId.
  return notImplemented(res, "아이디 찾기");
}

export function resetPassword(req, res) {
  // TODO: consume RESET_PASSWORD phone verification and update password hash.
  return notImplemented(res, "비밀번호 재설정");
}
