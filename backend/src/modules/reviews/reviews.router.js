import { Router } from "express";

import { requireAuth } from "../../common/auth/accessToken.js";
import { createReview, listReviewTags } from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.get("/tags", listReviewTags);
reviewsRouter.post("/", requireAuth, createReview);
