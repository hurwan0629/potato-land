import { Router } from "express";

import {
  getMyProfile,
  getUserProfile,
  updateMe,
  updateMyProfile,
  verifyMyPassword,
  withdrawMe,
  listUserReviews
} from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", getMyProfile);
usersRouter.patch("/me/profile", updateMyProfile);
usersRouter.post("/me/verify-password", verifyMyPassword);
usersRouter.patch("/me", updateMe);
usersRouter.delete("/me", withdrawMe);
usersRouter.get("/:userIdx/profile", getUserProfile);
usersRouter.get("/:userIdx/reviews", listUserReviews);
