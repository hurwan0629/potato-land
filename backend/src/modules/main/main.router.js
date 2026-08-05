import { Router } from "express";

<<<<<<< HEAD
import { getCategories, getMain } from "./main.controller.js";
=======
import { getMain, listCategories } from "./main.controller.js";
>>>>>>> origin/develop

export const mainRouter = Router();

mainRouter.get("/main", getMain);
<<<<<<< HEAD
mainRouter.get("/categories", getCategories);
=======
mainRouter.get("/categories", listCategories);
>>>>>>> origin/develop

// TODO: GET /api/search is excluded from MVP and intentionally not mounted.

