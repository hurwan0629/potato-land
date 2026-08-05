import { Router } from "express";

import { optionalAuth, requireAuth } from "../../common/middlewares/auth.middleware.js";
import { listingImageUpload } from "../../infrastructure/uploads/upload.js";
import {
  addUsedFavorite,
  createUsed,
  deleteUsed,
  getUsedDetail,
  listUsed,
  removeUsedFavorite,
  updateUsed,
} from "./used.controller.js";

export const usedRouter = Router();

usedRouter.get("/", optionalAuth, listUsed);
usedRouter.post("/", requireAuth, listingImageUpload, createUsed);
usedRouter.get("/:listingIdx", optionalAuth, getUsedDetail);
usedRouter.patch("/:listingIdx", requireAuth, listingImageUpload, updateUsed);
usedRouter.delete("/:listingIdx", requireAuth, deleteUsed);
usedRouter.post("/:listingIdx/favorite", requireAuth, addUsedFavorite);
usedRouter.delete("/:listingIdx/favorite", requireAuth, removeUsedFavorite);
