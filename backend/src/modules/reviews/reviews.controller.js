import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { createReview as createReviewService, listReviewTags as listReviewTagsService } from "./reviews.service.js";

export const listReviewTags = asyncHandler(async (_req, res) =>
  res.status(200).json({ success: true, data: await listReviewTagsService() }),
);

export const createReview = asyncHandler(async (req, res) =>
  res.status(201).json({ success: true, data: await createReviewService(req.user.userIdx, req.body) }),
);
