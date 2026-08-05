import { mkdirSync } from "node:fs";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { optionalAuth, requireAuth } from "../../common/middlewares/auth.middleware.js";
import { env } from "../../config/env.js";
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

const uploadDirectory = path.resolve(env.uploads.baseDir, env.uploads.listingImageDir);
mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename(_req, file, callback) {
      const safeExtension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
      callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExtension}`);
    },
  }),
  limits: { files: 4, fileSize: env.uploads.maxSizeBytes },
  fileFilter(_req, file, callback) {
    callback(null, file.mimetype.startsWith("image/"));
  },
});

export const auctionsRouter = Router();

auctionsRouter.get("/", optionalAuth, listAuctions);
auctionsRouter.post("/", requireAuth, upload.array("images", 4), createAuction);
auctionsRouter.get("/:listingIdx", optionalAuth, getAuctionDetail);
auctionsRouter.patch("/:listingIdx", requireAuth, upload.array("images", 4), updateAuction);
auctionsRouter.delete("/:listingIdx", requireAuth, deleteAuction);
auctionsRouter.post("/:listingIdx/bids", requireAuth, createAuctionBid);
auctionsRouter.get("/:listingIdx/bids", optionalAuth, listAuctionBids);
auctionsRouter.post("/:listingIdx/favorite", requireAuth, addAuctionFavorite);
auctionsRouter.delete("/:listingIdx/favorite", requireAuth, removeAuctionFavorite);
