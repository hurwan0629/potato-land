import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { env } from "../../config/env.js";
import { getMyAccount, updateMyAccount, verifyAccountPassword, withdrawMyAccount } from "./users.service.js";

/** 현재 로그인 사용자의 회원정보를 응답한다. */
export const getMyProfile = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getMyAccount(req.auth.userIdx) }));
/** 현재 비밀번호를 확인하고 회원정보 수정용 토큰을 발급한다. */
export const verifyMyPassword = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await verifyAccountPassword(req.auth.userIdx, req.body) }));
/** 검증된 회원정보 변경 요청을 처리한다. */
export const updateMe = asyncHandler(async (req, res) => { const result = await updateMyAccount(req.auth.userIdx, req.body); if (result.requiresLogin) { res.clearCookie("access_token", { path: env.jwt.accessToken.cookiePath }); res.clearCookie("refresh_token", { path: env.jwt.refreshToken.cookiePath }); } return res.status(200).json({ success: true, data: result }); });
/** 확인된 사용자를 탈퇴 처리하고 인증 쿠키를 만료한다. */
export const withdrawMe = asyncHandler(async (req, res) => { const result = await withdrawMyAccount(req.auth.userIdx, req.body); res.clearCookie("access_token", { path: env.jwt.accessToken.cookiePath }); res.clearCookie("refresh_token", { path: env.jwt.refreshToken.cookiePath }); return res.status(200).json({ success: true, data: result }); });
/** 공개 프로필 조회는 후속 구현 전까지 501을 반환한다. */
export function getUserProfile(_req, res) { return res.status(501).json({ success: false, code: "NOT_IMPLEMENTED", message: "사용자 공개 프로필 조회는 아직 구현되지 않았습니다." }); }
/** 공개 프로필 이미지와 소개 수정은 후속 구현 전까지 501을 반환한다. */
export function updateMyProfileImage(_req, res) { return res.status(501).json({ success: false, code: "NOT_IMPLEMENTED", message: "프로필 수정은 아직 구현되지 않았습니다." }); }
/** 별도 비밀번호 변경 API는 통합 회원정보 수정 API 사용을 안내한다. */
export function updateMyPassword(_req, res) { return res.status(501).json({ success: false, code: "USE_ACCOUNT_UPDATE", message: "회원정보 수정 API를 사용해주세요." }); }
/** 사용자 후기 목록 조회는 후속 구현 전까지 501을 반환한다. */
export function listUserReviews(_req, res) { return res.status(501).json({ success: false, code: "NOT_IMPLEMENTED", message: "사용자 후기 목록은 아직 구현되지 않았습니다." }); }
