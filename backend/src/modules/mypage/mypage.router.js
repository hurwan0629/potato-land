import { Router } from "express";

import {
  listMyFavorites,
  listMyHistory,
  listMyListings,
  listMyReviews,
  listUserListings,
} from "./mypage.controller.js";

export const mypageRouter = Router();

mypageRouter.get("/me/listings", listMyListings);
mypageRouter.get("/me/favorites", listMyFavorites);
mypageRouter.get("/me/history", listMyHistory);
mypageRouter.get("/me/reviews", listMyReviews);
mypageRouter.get("/:userIdx/listings", listUserListings);
