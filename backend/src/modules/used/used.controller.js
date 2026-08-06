import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  addUsedFavorite as addUsedFavoriteService,
  createUsedListing,
  deleteUsedListing,
  getUsedListing,
  listUsedListings,
  removeUsedFavorite as removeUsedFavoriteService,
  updateUsedListing,
} from "./used.service.js";

export const listUsed = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await listUsedListings(req.query, req.user?.userIdx ?? null) }));
export const createUsed = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await createUsedListing(req.user.userIdx, req.body, req.files ?? []) }));
export const getUsedDetail = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getUsedListing(req.params.listingIdx, req.user?.userIdx ?? null) }));
export const updateUsed = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await updateUsedListing(req.user.userIdx, req.params.listingIdx, req.body, req.files ?? []) }));
export const deleteUsed = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await deleteUsedListing(req.user, req.params.listingIdx, req.body) }));
export const addUsedFavorite = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await addUsedFavoriteService(req.user.userIdx, req.params.listingIdx) }));
export const removeUsedFavorite = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await removeUsedFavoriteService(req.user.userIdx, req.params.listingIdx) }));
