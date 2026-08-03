import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { notImplemented } from "../../common/utils/notImplemented.js";
import { checkLoginIdAvailability, getAuthenticatedUser, getPhoneVerificationStatus, loginUser, sendPhoneVerification, signupUser, verifyPhoneVerification } from "./auth.service.js";
import { setLoginCookies } from "./auth.token.js";

/** 회원가입 요청을 처리하고 생성된 사용자 정보를 응답한다. */
export const signup = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await signupUser(req.body) }));

/** query의 loginId가 사용 가능한지 응답한다. */
export const checkLoginId = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await checkLoginIdAvailability(req.query.loginId) }));

/** 휴대전화 인증번호를 발송하고 인증 식별자와 제한 시간을 응답한다. */
export const sendPhoneCode = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await sendPhoneVerification(req.body) }));

/** 입력한 인증번호를 검증하고 인증 완료 상태를 응답한다. */
export const verifyPhoneCode = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await verifyPhoneVerification(req.body) }));

/** 휴대전화 인증 완료 상태를 조회해 응답한다. */
export const getPhoneStatus = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getPhoneVerificationStatus(req.query) }));

/** 로그인 자격 증명을 확인하고 access/refresh HttpOnly 쿠키를 발급한다. */
export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body, { userAgent: req.get("user-agent") ?? "", ip: req.ip });
  setLoginCookies(res, result.tokens);
  return res.status(200).json({ success: true, data: result.user });
});

/** 로그아웃 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
export function logout(req, res) { return notImplemented(res, "로그아웃"); }

/** 토큰 재발급 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
export function refresh(req, res) { return notImplemented(res, "토큰 재발급"); }

/** access token으로 식별한 현재 활성 사용자 정보를 응답한다. */
export const getMe = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getAuthenticatedUser(req.auth.userIdx) }));

/** 아이디 찾기 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
export function findLoginId(req, res) { return notImplemented(res, "아이디 찾기"); }

/** 비밀번호 재설정 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
export function resetPassword(req, res) { return notImplemented(res, "비밀번호 재설정"); }
