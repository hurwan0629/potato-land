import { Router } from "express";

import { getMain, listCategories } from "./main.controller.js";

export const mainRouter = Router();

mainRouter.get("/main", getMain);
mainRouter.get("/categories", listCategories);

// TODO: GET /api/search is excluded from MVP and intentionally not mounted.
