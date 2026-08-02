import { Router } from "express";

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

auctionsRouter.get("/", listAuctions);
auctionsRouter.post("/", createAuction);
auctionsRouter.get("/:listingIdx", getAuctionDetail);
auctionsRouter.patch("/:listingIdx", updateAuction);
auctionsRouter.delete("/:listingIdx", deleteAuction);
auctionsRouter.post("/:listingIdx/bids", createAuctionBid);
auctionsRouter.get("/:listingIdx/bids", listAuctionBids);
auctionsRouter.post("/:listingIdx/favorite", addAuctionFavorite);
auctionsRouter.delete("/:listingIdx/favorite", removeAuctionFavorite);
