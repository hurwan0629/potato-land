import { Router } from "express";

import { optionalAuth, requireAuth } from "../../common/middlewares/auth.middleware.js";
import { listingImageUpload } from "../../infrastructure/uploads/upload.js";
import {
  addAuctionFavorite,
  createAuction,
  createAuctionBid,
  deleteAuction,
  getAuctionDetail,
  listAuctionBids,
  listAuctions,
  removeAuctionFavorite,
  updateAuction,
} from "./auctions.controller.js";

export const auctionsRouter = Router();

auctionsRouter.get("/", optionalAuth, listAuctions);
auctionsRouter.post("/", requireAuth, listingImageUpload, createAuction);
auctionsRouter.get("/:listingIdx", optionalAuth, getAuctionDetail);
auctionsRouter.patch("/:listingIdx", requireAuth, listingImageUpload, updateAuction);
auctionsRouter.delete("/:listingIdx", requireAuth, deleteAuction);
auctionsRouter.post("/:listingIdx/bids", requireAuth, createAuctionBid);
auctionsRouter.get("/:listingIdx/bids", optionalAuth, listAuctionBids);
auctionsRouter.post("/:listingIdx/favorite", requireAuth, addAuctionFavorite);
auctionsRouter.delete("/:listingIdx/favorite", requireAuth, removeAuctionFavorite);
