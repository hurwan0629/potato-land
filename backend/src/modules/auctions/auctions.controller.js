import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  addAuctionFavorite as addFavoriteService, createAuction as createAuctionService,
  createAuctionBid as createBidService, deleteAuction as deleteAuctionService,
  getAuction, getAuctions, listAuctionBids as listBidsService,
  removeAuctionFavorite as removeFavoriteService, updateAuction as updateAuctionService,
} from "./auctions.service.js";

export const listAuctions=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await getAuctions(req.query,req.user?.userIdx??null)}));
export const createAuction=asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await createAuctionService(req.user.userIdx,req.body,req.files??[])}));
export const getAuctionDetail=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await getAuction(req.params.listingIdx,req.user?.userIdx??null)}));
export const updateAuction=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await updateAuctionService(req.user.userIdx,req.params.listingIdx,req.body,req.files??[])}));
export const deleteAuction=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await deleteAuctionService(req.user,req.params.listingIdx,req.body)}));
export const createAuctionBid=asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await createBidService(req.user.userIdx,req.params.listingIdx,req.body)}));
export const listAuctionBids=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await listBidsService(req.params.listingIdx,req.query)}));
export const addAuctionFavorite=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await addFavoriteService(req.user.userIdx,req.params.listingIdx)}));
export const removeAuctionFavorite=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await removeFavoriteService(req.user.userIdx,req.params.listingIdx)}));
