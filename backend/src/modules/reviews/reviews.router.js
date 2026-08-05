import { Router } from "express";

import {
  createReview,
  listReviewTags,
} from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.get("/tags", listReviewTags);
reviewsRouter.post("/", createReview);
