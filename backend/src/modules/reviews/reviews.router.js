import { Router } from "express";

import {
  createReview,
  listUserReviews,
} from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.post("/", createReview);
reviewsRouter.get("/users/:userIdx", listUserReviews);
