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

// [2026-08-05 04:23:38] 검사 시작 
authRouter.post("/signup", signup);
// [2026-08-05 04:27:01] 검사 종료

// [2026-08-05 04:27:06] 검사 시작
authRouter.get("/check-id", checkLoginId);
authRouter.post("/phone/send", sendPhoneCode);
// [2026-08-05 04:50:50] 검사 종료

authRouter.post("/phone/verify", verifyPhoneCode);
// [2026-08-05 05:05:01] 검사 종료

// [2026-08-05 05:06:16] 검사 시작
authRouter.get("/phone/status", getPhoneStatus);
// [2026-08-05 05:11:26] 검사 완료

authRouter.post("/login", login);
// [2026-08-05 05:22:10] 검사 완료

// [2026-08-05 05:22:22] 검사 시작
authRouter.post("/refresh/logout", logout);
// [2026-08-05 05:35:26] 구현 완료

authRouter.post("/refresh", refresh);
// [2026-08-05 07:57:07] 구현 완료

authRouter.get("/me", requireAuth, getMe);
// [2026-08-05 07:59:02] 확인 완료

authRouter.post("/find-id", findLoginId);
// [2026-08-05 08:01:27] 검수 완료

authRouter.post("/password/reset", resetPassword);
// [2026-08-05 08:04:12] 검수 완료
