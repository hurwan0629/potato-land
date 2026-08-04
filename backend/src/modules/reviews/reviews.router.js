import { Router } from "express";

import {
  createReview,
  listReviewTags,
} from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.post("/reviews", createReview);
reviewsRouter.get("/users/:userIdx/reviews", listUserReviews);
