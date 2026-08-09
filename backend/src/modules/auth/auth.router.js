import { Router } from "express";
import { requireAuth } from "../../common/middlewares/auth.middleware.js";

import {
  checkLoginId,
  deleteSession,
  findLoginId,
  getMe,
  getSessions,
  getPhoneStatus,
  login,
  logout,
  logoutAll,
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
authRouter.post("/logout-all", requireAuth, logoutAll);
authRouter.get("/sessions", requireAuth, getSessions);
authRouter.delete("/sessions/:sessionId", requireAuth, deleteSession);
authRouter.get("/me", requireAuth, getMe);
authRouter.post("/find-id", findLoginId);
authRouter.post("/password/reset", resetPassword);
