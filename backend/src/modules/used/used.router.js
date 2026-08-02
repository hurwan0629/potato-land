import { Router } from "express";

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

usedRouter.get("/", listUsed);
usedRouter.post("/", createUsed);
usedRouter.get("/:listingIdx", getUsedDetail);
usedRouter.patch("/:listingIdx", updateUsed);
usedRouter.delete("/:listingIdx", deleteUsed);
usedRouter.post("/:listingIdx/favorite", addUsedFavorite);
usedRouter.delete("/:listingIdx/favorite", removeUsedFavorite);
