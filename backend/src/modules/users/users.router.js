import { Router } from "express";

import { requireAuth } from "../../common/middlewares/auth.middleware.js";
import { profileImageUpload } from "../../infrastructure/uploads/upload.js";
import {
  getMyProfile,
  getUserProfile,
  listUserReviews,
  updateMe,
  updateMyPassword,
  updateMyProfileImage,
  verifyMyPassword,
  withdrawMe,
} from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, getMyProfile);
usersRouter.patch("/me/profile", requireAuth, profileImageUpload, updateMyProfileImage);
usersRouter.post("/me/verify-password", requireAuth, verifyMyPassword);
usersRouter.patch("/me", requireAuth, updateMe);
usersRouter.patch("/me/password", requireAuth, updateMyPassword); // deprecated compatibility alias
usersRouter.delete("/me", requireAuth, withdrawMe);
usersRouter.get("/:userIdx/profile", getUserProfile);
usersRouter.get("/:userIdx/reviews", listUserReviews);
