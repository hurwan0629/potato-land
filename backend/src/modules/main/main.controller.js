import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { getCategoriesData, getMainData } from "./main.service.js";

export const getMain = asyncHandler(async (req, res) => {
  return res.status(200).json({ success: true, data: await getMainData(req.query) });
});

export const listCategories = asyncHandler(async (_req, res) => {
  return res.status(200).json({ success: true, data: await getCategoriesData() });
});
