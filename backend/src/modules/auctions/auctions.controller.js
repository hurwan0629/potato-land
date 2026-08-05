import { asyncHandler } from "../../common/utils/asyncHandler.js";
import { notImplemented } from "../../common/utils/notImplemented.js";
import { createAuction as createAuctionService, deleteAuction as deleteAuctionService, getAuction, getAuctions, updateAuction as updateAuctionService } from "./auctions.service.js";

/** 검색·정렬·페이지 조건에 맞는 경매 목록을 응답한다. */
export const listAuctions = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getAuctions(req.query) }));

/** 인증 사용자 소유의 새 경매 상품을 생성한다. */
export const createAuction = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await createAuctionService(req.auth.userIdx, req.body, req.files ?? []) }));

/** 경매 상세 정보와 현재 사용자의 가능한 동작을 응답한다. */
export const getAuctionDetail = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await getAuction(req.params.listingIdx, req.auth?.userIdx ?? null) }));

/** 판매자 소유의 진행 중 경매 상품 정보를 수정한다. */
export const updateAuction = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await updateAuctionService(req.auth.userIdx, req.params.listingIdx, req.body, req.files ?? []) }));

/** 판매자 또는 관리자가 경매 상품을 논리 삭제한다. */
export const deleteAuction = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await deleteAuctionService(req.auth, req.params.listingIdx, req.body) }));

/** 입찰 기능은 별도 동시성 구현 전까지 명시적인 미구현 응답을 반환한다. */
export function createAuctionBid(_req, res) { return notImplemented(res, "경매 입찰"); }

/** 입찰 목록 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
export function listAuctionBids(_req, res) { return notImplemented(res, "경매 입찰 내역 조회"); }

/** 관심 등록 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
export function addAuctionFavorite(_req, res) { return notImplemented(res, "경매 관심 추가"); }

/** 관심 해제 기능은 후속 구현 전까지 명시적인 미구현 응답을 반환한다. */
export function removeAuctionFavorite(_req, res) { return notImplemented(res, "경매 관심 해제"); }
