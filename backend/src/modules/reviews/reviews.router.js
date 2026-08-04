import { Router } from "express";

import {
  createReview,
  listReviewTags,
} from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.get("/reviews/tags", listReviewTags);
reviewsRouter.post("/reviews", createReview);
