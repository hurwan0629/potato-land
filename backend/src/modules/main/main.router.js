import { Router } from "express";

import { getCategories, getMain } from "./main.controller.js";

export const mainRouter = Router();

mainRouter.get("/main", getMain);
mainRouter.get("/categories", getCategories);

// TODO: GET /api/search is excluded from MVP and intentionally not mounted.

