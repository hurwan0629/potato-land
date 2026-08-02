import { Router } from "express";

import {
  getMyProfile,
  getUserProfile,
  updateMe,
  updateMyPassword,
  updateMyProfileImage,
  verifyMyPassword,
  withdrawMe,
} from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", getMyProfile);
usersRouter.patch("/me/profile", updateMyProfileImage);
usersRouter.post("/me/verify-password", verifyMyPassword);
usersRouter.patch("/me", updateMe);
usersRouter.patch("/me/password", updateMyPassword);
usersRouter.delete("/me", withdrawMe);
usersRouter.get("/:userIdx/profile", getUserProfile);
