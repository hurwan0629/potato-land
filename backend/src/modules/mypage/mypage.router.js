import { Router } from "express";

import { requireAuth } from "../../common/auth/accessToken.js";
import {
  listMyFavorites,
  listMyHistory,
  listMyListings,
  listMyReviews,
  listUserListings,
} from "./mypage.controller.js";

export const mypageRouter = Router();

mypageRouter.get("/me/listings", requireAuth, listMyListings);
mypageRouter.get("/me/favorites", requireAuth, listMyFavorites);
mypageRouter.get("/me/history", requireAuth, listMyHistory);
mypageRouter.get("/me/reviews", requireAuth, listMyReviews);
mypageRouter.get("/:userIdx/listings", listUserListings);
