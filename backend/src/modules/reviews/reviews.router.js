import { Router } from "express";

import { createReview, listUserReviews } from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.post("/reviews", createReview);
reviewsRouter.get("/users/:userIdx/reviews", listUserReviews);
