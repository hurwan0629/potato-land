import { Router } from "express";

import { requireAuth, requireRole } from "../../common/auth/accessToken.js";
import {
  banUser, deleteAuctionForAdmin, deleteUsedForAdmin, getDashboard, getUser,
  listAuctionWinners, listAuctionsForAdmin, listUserReviewsForAdmin,
  listUserTransactionsForAdmin, listUsedForAdmin, listUsers, updateUserMemo,
} from "./admin.controller.js";

export const adminRouter=Router();
adminRouter.use(requireAuth,requireRole("ADMIN"));
adminRouter.get("/dashboard",getDashboard);
adminRouter.get("/users",listUsers);
adminRouter.get("/users/:userIdx/transactions",listUserTransactionsForAdmin);
adminRouter.get("/users/:userIdx/reviews",listUserReviewsForAdmin);
adminRouter.get("/users/:userIdx",getUser);
adminRouter.patch("/users/:userIdx/ban",banUser);
adminRouter.patch("/users/:userIdx/memo",updateUserMemo);
adminRouter.get("/used",listUsedForAdmin);
adminRouter.delete("/used/:listingIdx",deleteUsedForAdmin);
adminRouter.get("/auctions",listAuctionsForAdmin);
adminRouter.get("/auctions/winners",listAuctionWinners);
adminRouter.delete("/auctions/:listingIdx",deleteAuctionForAdmin);
