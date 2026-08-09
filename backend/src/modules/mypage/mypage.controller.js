import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  listMyFavorites as listMyFavoritesService,
  listMyHistory as listMyHistoryService,
  listMyListings as listMyListingsService,
  listMyReviews as listMyReviewsService,
  listUserListings as listUserListingsService,
} from "./mypage.service.js";

/** 로그인 사용자가 등록한 게시글 목록을 응답한다. */
export const listMyListings = asyncHandler(async (req, res) => {
  const data = await listMyListingsService(req.user.userIdx, req.query);
  return res.status(200).json({ success: true, data });
});

/** 로그인 사용자의 관심상품 목록을 응답한다. */
export const listMyFavorites = asyncHandler(async (req, res) => {
  const data = await listMyFavoritesService(req.user.userIdx, req.query);
  return res.status(200).json({ success: true, data });
});

/** 로그인 사용자의 거래 이력 목록을 응답한다. */
export const listMyHistory = asyncHandler(async (req, res) => {
  const data = await listMyHistoryService(req.user.userIdx, req.query);
  return res.status(200).json({ success: true, data });
});

/** 로그인 사용자의 후기 활동 목록을 응답한다. */
export const listMyReviews = asyncHandler(async (req, res) => {
  const data = await listMyReviewsService(req.user.userIdx, req.query);
  return res.status(200).json({ success: true, data });
});

/** 공개 프로필에서 특정 회원의 게시글 목록을 응답한다. */
export const listUserListings = asyncHandler(async (req, res) => {
  const data = await listUserListingsService(req.params.userIdx, req.query);
  return res.status(200).json({ success: true, data });
});
