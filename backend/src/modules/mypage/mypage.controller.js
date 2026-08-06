import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  listMyFavorites as listMyFavoritesService,
  listMyHistory as listMyHistoryService,
  listMyListings as listMyListingsService,
  listMyReviews as listMyReviewsService,
  listUserListings as listUserListingsService,
} from "./mypage.service.js";

export const listMyListings = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await listMyListingsService(req.user.userIdx, req.query) }));
export const listMyFavorites = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await listMyFavoritesService(req.user.userIdx, req.query) }));
export const listMyHistory = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await listMyHistoryService(req.user.userIdx, req.query) }));
export const listMyReviews = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await listMyReviewsService(req.user.userIdx, req.query) }));
export const listUserListings = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await listUserListingsService(req.params.userIdx, req.query) }));
