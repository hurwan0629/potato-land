import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { getCategoriesData, getMainData } from "./main.service.js";

/** 메인 화면에 필요한 섹션별 상품 데이터를 응답한다. */
export const getMain = asyncHandler(async (req, res) => {
  const data = await getMainData(req.query);
  return res.status(200).json({ success: true, data });
});

/** 활성 카테고리 목록을 응답한다. */
export const listCategories = asyncHandler(async (_req, res) => {
  const data = await getCategoriesData();
  return res.status(200).json({ success: true, data });
});
