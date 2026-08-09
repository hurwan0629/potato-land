import { Router } from "express";

import { requireAuth } from "../../common/auth/accessToken.js";
import { createReview } from "./reviews.controller.js";

export const reviewsRouter = Router();

reviewsRouter.post("/", requireAuth, createReview);
