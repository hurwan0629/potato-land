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

export const getMyProfile = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getMyAccount(req.user.userIdx) }));
export const getUserProfile = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getPublicProfile(req.params.userIdx) }));
export const updateMyProfileImage = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await updateMyPublicProfile(req.user.userIdx, req.body, req.files ?? []) }));
export const verifyMyPassword = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await verifyAccountPassword(req.user.userIdx, req.body) }));
export const updateMe = asyncHandler(async (req, res) => {
  const result = await updateMyAccount(req.user.userIdx, req.body);
  if (result.requiresLogin) {
    res.clearCookie("access_token", { path: env.jwt.accessToken.cookiePath });
    res.clearCookie("refresh_token", { path: env.jwt.refreshToken.cookiePath });
  }
  return res.status(200).json({ success: true, data: result });
});
export const updateMyPassword = updateMe;
export const withdrawMe = asyncHandler(async (req, res) => {
  const result = await withdrawMyAccount(req.user.userIdx, req.body);
  res.clearCookie("access_token", { path: env.jwt.accessToken.cookiePath });
  res.clearCookie("refresh_token", { path: env.jwt.refreshToken.cookiePath });
  return res.status(200).json({ success: true, data: result });
});
export const listUserReviews = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await listReceivedReviews(req.params.userIdx, req.query) }));
