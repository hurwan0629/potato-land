import { Router } from "express";
import { requireAuth } from "../../common/middlewares/auth.middleware.js";

import {
  checkLoginId,
  findLoginId,
  getMe,
  getPhoneStatus,
  login,
  logout,
  refresh,
  resetPassword,
  sendPhoneCode,
  signup,
  verifyPhoneCode,
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.get("/check-id", checkLoginId);
authRouter.post("/phone/send", sendPhoneCode);
authRouter.post("/phone/verify", verifyPhoneCode);
authRouter.get("/phone/status", getPhoneStatus);
authRouter.post("/login", login);
authRouter.post("/refresh/logout", logout);
authRouter.post("/refresh", refresh);
authRouter.get("/me", requireAuth, getMe);
authRouter.post("/find-id", findLoginId);
authRouter.post("/password/reset", resetPassword);
