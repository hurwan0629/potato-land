import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  checkLoginIdAvailability,
  findLoginIdByPhone,
  getAuthenticatedUser,
  getLoginSessions,
  getPhoneVerificationStatus,
  loginUser,
  logoutAllSessions,
  logoutCurrentSession,
  logoutSession,
  refreshLoginSession,
  resetUserPassword,
  sendPhoneVerification,
  signupUser,
  verifyPhoneVerification,
} from "./auth.service.js";
import { clearLoginCookies, setLoginCookies } from "./auth.token.js";

/** 회원가입 요청을 처리하고 생성된 사용자 정보를 응답한다. */
export const signup = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await signupUser(req.body) }));

/** 요청한 로그인 아이디의 사용 가능 여부를 응답한다. */
export const checkLoginId = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await checkLoginIdAvailability(req.query.loginId) }));

/** 휴대전화 인증번호를 발송하고 인증 식별자와 유효 시간을 응답한다. */
export const sendPhoneCode = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await sendPhoneVerification(req.body) }));

/** 사용자가 입력한 휴대전화 인증번호를 검증한다. */
export const verifyPhoneCode = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await verifyPhoneVerification(req.body) }));

/** 휴대전화 인증 완료 상태와 만료 시각을 조회한다. */
export const getPhoneStatus = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getPhoneVerificationStatus(req.query) }));

/** 로그인 자격 증명을 확인하고 access/refresh HttpOnly 쿠키를 발급한다. */
export const login = asyncHandler(async (req, res) => {
  // Service에는 브라우저·IP 정보를 함께 전달해 기기별 세션 정보로 기록한다.
  const result = await loginUser(req.body, { userAgent: req.get("user-agent") ?? "", ip: req.ip });

  // JWT 원문은 응답 body가 아닌 HttpOnly 쿠키로만 전달한다.
  setLoginCookies(res, result.tokens);
  return res.status(200).json({ success: true, data: result.user });
});

/** Refresh Token이 가리키는 현재 기기 세션을 폐기하고 인증 쿠키를 만료시킨다. */
export const logout = asyncHandler(async (req, res) => {
  // 서버의 현재 Refresh 세션을 먼저 폐기한 뒤 브라우저 쿠키를 제거한다.
  const result = await logoutCurrentSession(req.cookies.refresh_token);
  clearLoginCookies(res);
  return res.status(200).json({ success: true, data: result });
});

/** Refresh Token을 rotation하고 새 access/refresh 쿠키를 함께 발급한다. */
export const refresh = asyncHandler(async (req, res) => {
  try {
    // Refresh 쿠키와 현재 요청 정보를 이용해 같은 기기의 토큰을 rotation한다.
    const result = await refreshLoginSession(req.cookies.refresh_token, { userAgent: req.get("user-agent") ?? "", ip: req.ip });

    // Rotation에 성공한 경우에만 두 쿠키를 새 토큰으로 덮어쓴다.
    setLoginCookies(res, result.tokens);
    return res.status(200).json({ success: true, data: { refreshed: result.refreshed } });
  } catch (error) {
    // 재발급 실패 후 잘못된 쿠키로 반복 요청하지 않도록 두 쿠키를 함께 만료시킨다.
    clearLoginCookies(res);
    throw error;
  }
});

/** 로그인 사용자의 모든 기기 세션을 폐기하고 현재 브라우저 쿠키도 만료시킨다. */
export const logoutAll = asyncHandler(async (req, res) => {
  // Access Token의 사용자 식별자로 다른 기기를 포함한 모든 세션을 제거한다.
  const result = await logoutAllSessions(req.auth.userIdx);
  clearLoginCookies(res);
  return res.status(200).json({ success: true, data: result });
});

/** 현재 사용자의 기기별 로그인 세션 목록을 조회한다. */
export const getSessions = asyncHandler(async (req, res) => res.status(200).json({
  success: true,
  data: { sessions: await getLoginSessions(req.auth.userIdx, req.auth.sessionId) },
}));

/** 선택한 기기의 Refresh 세션을 폐기한다. */
export const deleteSession = asyncHandler(async (req, res) => {
  const result = await logoutSession(req.auth.userIdx, req.params.sessionId);

  // 사용자가 현재 기기 세션을 선택했다면 Access 쿠키까지 제거해 즉시 로그아웃한다.
  if (req.params.sessionId === req.auth.sessionId) clearLoginCookies(res);
  return res.status(200).json({ success: true, data: result });
});

/** access token으로 식별한 현재 활성 사용자 정보를 응답한다. */
export const getMe = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getAuthenticatedUser(req.auth.userIdx) }));

/** 본인인증을 완료한 사용자의 로그인 아이디를 조회한다. */
export const findLoginId = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await findLoginIdByPhone(req.body) }));

/** 본인인증을 완료한 사용자의 비밀번호를 새 값으로 변경한다. */
export const resetPassword = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await resetUserPassword(req.body) }));
