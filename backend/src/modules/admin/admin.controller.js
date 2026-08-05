import { asyncHandler } from "../../common/utils/asyncHandler.js";
import {
  banUser as banUserService, deleteAuctionForAdmin as deleteAuctionService,
  deleteUsed as deleteUsedService, getDashboard as getDashboardService,
  getUser as getUserService, listAdminListings, listReviews, listTransactions,
  listUsers as listUsersService, listWinners, updateUserMemo as updateUserMemoService,
} from "./admin.service.js";

export const getDashboard=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await getDashboardService(req.query)}));
export const listUsers=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await listUsersService(req.query)}));
export const getUser=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await getUserService(req.params.userIdx)}));
export const banUser=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await banUserService(req.user.userIdx,req.params.userIdx,req.body)}));
export const updateUserMemo=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await updateUserMemoService(req.params.userIdx,req.body)}));
export const listUsedForAdmin=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await listAdminListings("USED",req.query)}));
export const deleteUsedForAdmin=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await deleteUsedService(req.user,req.params.listingIdx,req.body)}));
export const listAuctionsForAdmin=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await listAdminListings("AUCTION",req.query)}));
export const deleteAuctionForAdmin=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await deleteAuctionService(req.user,req.params.listingIdx,req.body)}));
export const listAuctionWinners=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await listWinners(req.query)}));
export const listUserTransactionsForAdmin=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await listTransactions(req.params.userIdx,req.query)}));
export const listUserReviewsForAdmin=asyncHandler(async(req,res)=>res.status(200).json({success:true,data:await listReviews(req.params.userIdx,req.query)}));
