import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { createReview as createReviewService } from "./reviews.service.js";

export const createReview = asyncHandler(async (req, res) => {
  const data = await createReviewService(req.user.userIdx, req.body);
  res.status(201).json({ success: true, data });
});
