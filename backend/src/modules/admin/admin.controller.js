import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  banUser as banUserService,
  deleteAuctionForAdmin as deleteAuctionService,
  deleteUsed as deleteUsedService,
  getDashboard as getDashboardService,
  getUser as getUserService,
  listAdminListings,
  listReviews,
  listTransactions,
  listUsers as listUsersService,
  listWinners,
  updateUserMemo as updateUserMemoService,
} from "./admin.service.js";

/** 관리자 대시보드 통계와 기간별 집계를 응답한다. */
export const getDashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardService(req.query);
  return res.status(200).json({ success: true, data });
});

/** 관리자 회원 목록을 검색·상태·페이지 조건에 맞춰 응답한다. */
export const listUsers = asyncHandler(async (req, res) => {
  const data = await listUsersService(req.query);
  return res.status(200).json({ success: true, data });
});

/** 관리자 회원 상세 정보를 응답한다. */
export const getUser = asyncHandler(async (req, res) => {
  const data = await getUserService(req.params.userIdx);
  return res.status(200).json({ success: true, data });
});

/** 관리자가 지정 회원을 영구정지 처리한다. */
export const banUser = asyncHandler(async (req, res) => {
  const data = await banUserService(
    req.user.userIdx,
    req.params.userIdx,
    req.body,
  );
  return res.status(200).json({ success: true, data });
});

/** 관리자 회원 메모를 저장한다. */
export const updateUserMemo = asyncHandler(async (req, res) => {
  const data = await updateUserMemoService(req.params.userIdx, req.body);
  return res.status(200).json({ success: true, data });
});

/** 관리자 중고상품 목록을 응답한다. */
export const listUsedForAdmin = asyncHandler(async (req, res) => {
  const data = await listAdminListings("USED", req.query);
  return res.status(200).json({ success: true, data });
});

/** 관리자가 중고상품을 논리 삭제한다. */
export const deleteUsedForAdmin = asyncHandler(async (req, res) => {
  const data = await deleteUsedService(
    req.user,
    req.params.listingIdx,
    req.body,
  );
  return res.status(200).json({ success: true, data });
});

/** 관리자 경매 목록을 응답한다. */
export const listAuctionsForAdmin = asyncHandler(async (req, res) => {
  const data = await listAdminListings("AUCTION", req.query);
  return res.status(200).json({ success: true, data });
});

/** 관리자가 경매를 논리 삭제한다. */
export const deleteAuctionForAdmin = asyncHandler(async (req, res) => {
  const data = await deleteAuctionService(
    req.user,
    req.params.listingIdx,
    req.body,
  );
  return res.status(200).json({ success: true, data });
});

/** 종료된 경매의 낙찰자 목록을 응답한다. */
export const listAuctionWinners = asyncHandler(async (req, res) => {
  const data = await listWinners(req.query);
  return res.status(200).json({ success: true, data });
});

/** 특정 회원의 거래 이력을 관리자 화면에 응답한다. */
export const listUserTransactionsForAdmin = asyncHandler(async (req, res) => {
  const data = await listTransactions(req.params.userIdx, req.query);
  return res.status(200).json({ success: true, data });
});

/** 특정 회원의 후기 활동 이력을 관리자 화면에 응답한다. */
export const listUserReviewsForAdmin = asyncHandler(async (req, res) => {
  const data = await listReviews(req.params.userIdx, req.query);
  return res.status(200).json({ success: true, data });
});
