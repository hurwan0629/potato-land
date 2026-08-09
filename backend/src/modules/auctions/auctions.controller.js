import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  addAuctionFavorite as addFavoriteService,
  createAuction as createAuctionService,
  createAuctionBid as createBidService,
  deleteAuction as deleteAuctionService,
  getAuction,
  getAuctions,
  listAuctionBids as listBidsService,
  removeAuctionFavorite as removeFavoriteService,
  updateAuction as updateAuctionService,
} from "./auctions.service.js";

/** 경매 목록을 조회한다. 로그인 사용자는 개인화 상태를 함께 받는다. */
export const listAuctions = asyncHandler(async (req, res) => {
  const data = await getAuctions(
    req.query,
    req.user?.userIdx ?? null,
  );

  res.status(200).json({ success: true, data });
});

/** 이미지와 입력값을 전달해 새 경매를 생성한다. */
export const createAuction = asyncHandler(async (req, res) => {
  const data = await createAuctionService(
    req.user.userIdx,
    req.body,
    req.files ?? [],
  );

  res.status(201).json({ success: true, data });
});

/** 경매 상세 정보와 현재 사용자의 행동 가능 상태를 조회한다. */
export const getAuctionDetail = asyncHandler(async (req, res) => {
  const data = await getAuction(
    req.params.listingIdx,
    req.user?.userIdx ?? null,
  );

  res.status(200).json({ success: true, data });
});

/** 판매자가 진행 중인 경매를 수정한다. */
export const updateAuction = asyncHandler(async (req, res) => {
  const data = await updateAuctionService(
    req.user.userIdx,
    req.params.listingIdx,
    req.body,
    req.files ?? [],
  );

  res.status(200).json({ success: true, data });
});

/** 판매자 또는 관리자가 경매를 논리 삭제한다. */
export const deleteAuction = asyncHandler(async (req, res) => {
  const data = await deleteAuctionService(
    req.user,
    req.params.listingIdx,
    req.body,
  );

  res.status(200).json({ success: true, data });
});

/** 진행 중 경매에 새 입찰을 등록한다. */
export const createAuctionBid = asyncHandler(async (req, res) => {

  // 입찰 생성해주기
  const data = await createBidService(
    req.user.userIdx,
    req.params.listingIdx,
    req.body,
  );

  res.status(201).json({ success: true, data });
});

/** 경매 입찰 목록을 페이지 단위로 조회한다. */
export const listAuctionBids = asyncHandler(async (req, res) => {
  const data = await listBidsService(
    req.params.listingIdx,
    req.query,
  );

  res.status(200).json({ success: true, data });
});

/** 경매를 관심상품으로 등록한다. */
export const addAuctionFavorite = asyncHandler(async (req, res) => {
  const data = await addFavoriteService(
    req.user.userIdx,
    req.params.listingIdx,
  );

  res.status(200).json({ success: true, data });
});

/** 경매 관심상품 등록을 해제한다. */
export const removeAuctionFavorite = asyncHandler(async (req, res) => {
  const data = await removeFavoriteService(
    req.user.userIdx,
    req.params.listingIdx,
  );

  res.status(200).json({ success: true, data });
});
