import { Router } from "express";
import { requireAuth } from "../../common/middlewares/auth.middleware.js";

import {
  getMyProfile,
  getUserProfile,
  updateMe,
  updateMyProfile,
  verifyMyPassword,
  updateMyPassword,
  withdrawMe,
} from "./users.controller.js";

import { listUserReviews } from "../reviews/reviews.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, getMyProfile);
usersRouter.patch("/me/profile", requireAuth, updateMyProfile);
usersRouter.post("/me/verify-password", requireAuth, verifyMyPassword);
usersRouter.patch("/me", requireAuth, updateMe);
// usersRouter.patch("/me/password", requireAuth, updateMyPassword);
usersRouter.delete("/me", requireAuth, withdrawMe);
usersRouter.get("/:userIdx/profile", getUserProfile);
usersRouter.get("/:userIdx/reviews", listUserReviews);
