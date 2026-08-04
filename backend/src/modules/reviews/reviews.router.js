import { Router } from "express";

<<<<<<< Updated upstream
import { createReview, listUserReviews } from "./reviews.controller.js";
=======
import {
  createReview,
  listReviewTags,
} from "./reviews.controller.js";
>>>>>>> Stashed changes

export const reviewsRouter = Router();

reviewsRouter.post("/reviews", createReview);
reviewsRouter.get("/users/:userIdx/reviews", listUserReviews);
