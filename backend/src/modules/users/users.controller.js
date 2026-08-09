import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { env } from "../../config/env.js";
import { listReceivedReviews } from "../reviews/reviews.service.js";
import {
  getMyAccount,
  getPublicProfile,
  updateMyAccount,
  updateMyPublicProfile,
  verifyAccountPassword,
  withdrawMyAccount,
} from "./users.service.js";

/** 로그인 사용자의 계정 요약과 공개 프로필 정보를 응답한다. */
export const getMyProfile = asyncHandler(async (req, res) => {
  const data = await getMyAccount(req.user.userIdx);
  return res.status(200).json({ success: true, data });
});

/** 특정 회원의 공개 프로필 정보를 응답한다. */
export const getUserProfile = asyncHandler(async (req, res) => {
  const data = await getPublicProfile(req.params.userIdx);
  return res.status(200).json({ success: true, data });
});

/** 로그인 사용자의 공개 프로필과 프로필 이미지를 수정한다. */
export const updateMyProfileImage = asyncHandler(async (req, res) => {
  const data = await updateMyPublicProfile(
    req.user.userIdx,
    req.body,
    req.files ?? [],
  );
  return res.status(200).json({ success: true, data });
});

/** 민감한 계정 수정 전에 로그인 사용자의 현재 비밀번호를 확인한다. */
export const verifyMyPassword = asyncHandler(async (req, res) => {
  const data = await verifyAccountPassword(req.user.userIdx, req.body);
  return res.status(200).json({ success: true, data });
});

/** 로그인 사용자의 계정 정보를 수정하고 필요하면 인증 쿠키를 제거한다. */
export const updateMe = asyncHandler(async (req, res) => {
  const result = await updateMyAccount(req.user.userIdx, req.body);
  if (result.requiresLogin) {
    res.clearCookie("access_token", { path: env.jwt.accessToken.cookiePath });
    res.clearCookie("refresh_token", { path: env.jwt.refreshToken.cookiePath });
  }
  return res.status(200).json({ success: true, data: result });
});

/** 비밀번호 변경 라우트는 계정 수정과 같은 처리 흐름을 사용한다. */
export const updateMyPassword = updateMe;

/** 로그인 사용자의 계정을 탈퇴 처리하고 인증 쿠키를 제거한다. */
export const withdrawMe = asyncHandler(async (req, res) => {
  const result = await withdrawMyAccount(req.user.userIdx, req.body);
  res.clearCookie("access_token", { path: env.jwt.accessToken.cookiePath });
  res.clearCookie("refresh_token", { path: env.jwt.refreshToken.cookiePath });
  return res.status(200).json({ success: true, data: result });
});

/** 특정 회원이 받은 후기 목록을 응답한다. */
export const listUserReviews = asyncHandler(async (req, res) => {
  const data = await listReceivedReviews(req.params.userIdx, req.query);
  return res.status(200).json({ success: true, data });
});
