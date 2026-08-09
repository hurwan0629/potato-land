import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  addUsedFavorite as addUsedFavoriteService,
  createUsedListing,
  deleteUsedListing,
  getUsedListing,
  listUsedListings,
  removeUsedFavorite as removeUsedFavoriteService,
  updateUsedListing,
} from "./used.service.js";

/** 중고상품 목록을 조회한다. 로그인 사용자는 관심 여부를 함께 받는다. */
export const listUsed = asyncHandler(async (req, res) => {
  const data = await listUsedListings(
    req.query,
    req.user?.userIdx ?? null,
  );
  return res.status(200).json({ success: true, data });
});

/** 로그인 사용자의 새 중고상품 게시글을 생성한다. */
export const createUsed = asyncHandler(async (req, res) => {
  const data = await createUsedListing(
    req.user.userIdx,
    req.body,
    req.files ?? [],
  );
  return res.status(201).json({ success: true, data });
});

/** 중고상품 상세 정보와 현재 사용자의 관심 여부를 응답한다. */
export const getUsedDetail = asyncHandler(async (req, res) => {
  const data = await getUsedListing(
    req.params.listingIdx,
    req.user?.userIdx ?? null,
  );
  return res.status(200).json({ success: true, data });
});

/** 판매자가 자신의 중고상품 게시글을 수정한다. */
export const updateUsed = asyncHandler(async (req, res) => {
  const data = await updateUsedListing(
    req.user.userIdx,
    req.params.listingIdx,
    req.body,
    req.files ?? [],
  );
  return res.status(200).json({ success: true, data });
});

/** 판매자 또는 관리자가 중고상품 게시글을 논리 삭제한다. */
export const deleteUsed = asyncHandler(async (req, res) => {
  const data = await deleteUsedListing(
    req.user,
    req.params.listingIdx,
    req.body,
  );
  return res.status(200).json({ success: true, data });
});

/** 로그인 사용자가 중고상품을 관심상품으로 등록한다. */
export const addUsedFavorite = asyncHandler(async (req, res) => {
  const data = await addUsedFavoriteService(
    req.user.userIdx,
    req.params.listingIdx,
  );
  return res.status(200).json({ success: true, data });
});

/** 로그인 사용자가 중고상품 관심상품 등록을 해제한다. */
export const removeUsedFavorite = asyncHandler(async (req, res) => {
  const data = await removeUsedFavoriteService(
    req.user.userIdx,
    req.params.listingIdx,
  );
  return res.status(200).json({ success: true, data });
});
