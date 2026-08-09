import { Router } from "express";

import { requireAuth, requireRole } from "../../common/auth/accessToken.js";
import {
  banUser,
  deleteAuctionForAdmin,
  deleteUsedForAdmin,
  getDashboard,
  getUser,
  listAuctionWinners,
  listAuctionsForAdmin,
  listUserReviewsForAdmin,
  listUserTransactionsForAdmin,
  listUsedForAdmin,
  listUsers,
  updateUserMemo,
} from "./admin.controller.js";

/** 관리자 전용 API 라우터를 생성한다. */
export const adminRouter = Router();

// 모든 관리자 API는 로그인과 ADMIN 권한을 먼저 확인한다.
adminRouter.use(requireAuth, requireRole("ADMIN"));

// 대시보드와 회원 관리 API를 연결한다.
adminRouter.get("/dashboard", getDashboard);
adminRouter.get("/users", listUsers);
adminRouter.get("/users/:userIdx/transactions", listUserTransactionsForAdmin);
adminRouter.get("/users/:userIdx/reviews", listUserReviewsForAdmin);
adminRouter.get("/users/:userIdx", getUser);
adminRouter.patch("/users/:userIdx/ban", banUser);
adminRouter.patch("/users/:userIdx/memo", updateUserMemo);

// 게시글·경매 관리자 API를 연결한다.
adminRouter.get("/used", listUsedForAdmin);
adminRouter.delete("/used/:listingIdx", deleteUsedForAdmin);
adminRouter.get("/auctions", listAuctionsForAdmin);
adminRouter.get("/auctions/winners", listAuctionWinners);
adminRouter.delete("/auctions/:listingIdx", deleteAuctionForAdmin);
