import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { cancelAuctionEnd, hasAuctionTimer, scheduleAuctionEnd } from "../../schedulers/auctionTimer.js";
import {
  emitAuctionBidUpdated, emitAuctionDeleted, emitAuctionEnded,
  emitAuctionLeaderChanged, emitAuctionOutbid, emitAuctionWon,
} from "../../sockets/emitters/auction.emitter.js";
import { emitNotificationNew, emitNotificationUnreadCount } from "../../sockets/emitters/notification.emitter.js";
import {
  addAuctionFavoriteRow, finalizeAuctionRecord, findAuctionBids, findAuctionDetail,
  findAuctionForMutation, findAuctionRoomState, findAuctions, findRecoverableAuctions,
  increaseAuctionViewCount, insertAuction, insertBid, removeAuctionFavoriteRow,
  softDeleteAuction, updateAuctionRecord,
} from "./auctions.repository.js";
import {
  validateAuctionCreate, validateAuctionDelete, validateAuctionList, validateAuctionUpdate,
  validateBidAmount, validateBidList, validateListingIdx,
} from "./auctions.validator.js";

const log=logger.child("auction-service");
function imageUrls(files){return files.map((file)=>file.resourceUrl);}
function emitSafely(name,work,context){try{work();}catch(error){log.warn(`${name} Socket 전송에 실패했습니다.`,{error,...context});}}
function listItem(row){return{listingIdx:Number(row.idx),listingType:"AUCTION",title:row.title,thumbnailUrl:row.thumbnail_url,category:{categoryIdx:Number(row.category_idx),name:row.category_name},startPrice:Number(row.start_price),currentPrice:Number(row.current_price),displayPrice:Number(row.current_price),status:row.status,bidCount:Number(row.bid_count),favoriteCount:Number(row.favorite_count),startedAt:row.started_at,endsAt:row.ends_at,hasMyBid:Boolean(row.has_my_bid),myBidAmount:row.my_bid_amount==null?null:Number(row.my_bid_amount),isFavorite:Boolean(row.is_favorite)};}

export async function getAuctions(query,viewerUserIdx=null) {

  const data=validateAuctionList(query);
  
  const result=await findAuctions(data,viewerUserIdx);
  
  return{
    items:result.rows.map(listItem),
    page:data.page,
    limit:data.limit,
    totalCount:result.totalCount,
    totalPages:Math.ceil(result.totalCount/data.limit)
  };
}

/** 1. 입력과 이미지를 검증한다. 2. DB에 경매를 저장한다. 3. commit 후 종료 Timer와 Redis cache를 등록한다. */
export async function createAuction(userIdx,body,files=[]){const data=validateAuctionCreate(body,files);const startedAt=new Date(),endsAt=new Date(startedAt.getTime()+24*60*60*1000),bidUnit=1000;let listingIdx;try{listingIdx=await insertAuction({sellerIdx:userIdx,...data,imageUrls:imageUrls(files),startedAt,endsAt,bidUnit});}catch(error){if(error.code==="23503")throw new AppError({status:400,code:"VALIDATION_ERROR",message:"카테고리를 확인해주세요.",details:{field:"categoryIdx"}});throw error;}scheduleAuctionEnd(listingIdx,endsAt,finalizeAuction);await writeAuctionCache(listingIdx,{currentPrice:data.startPrice,bidUnit,endsAt,status:"ON_GOING"});return{listingIdx:Number(listingIdx),listingType:"AUCTION",status:"ON_GOING",startPrice:data.startPrice,currentPrice:data.startPrice,bidUnit,startedAt,endsAt};}

export async function getAuction(listingIdxValue,viewerUserIdx=null){const listingIdx=validateListingIdx(listingIdxValue);const auction=await findAuctionDetail(listingIdx,viewerUserIdx);if(!auction)throw new AppError({status:404,code:"NOT_FOUND",message:"경매를 찾을 수 없습니다."});await increaseAuctionViewCount(listingIdx);const isOwner=viewerUserIdx!==null&&Number(auction.seller_idx)===Number(viewerUserIdx);const ongoing=auction.status==="ON_GOING"&&new Date(auction.ends_at).getTime()>Date.now();return{listingIdx,listingType:"AUCTION",title:auction.title,description:auction.description,category:{categoryIdx:Number(auction.category_idx),name:auction.category_name},productStatus:auction.product_status,preferredTradeLocation:auction.preferred_trade_location,startPrice:Number(auction.start_price),currentPrice:Number(auction.current_price),minNextBid:Number(auction.current_price)+Number(auction.bid_unit),status:ongoing?"ON_GOING":"FINISHED",startedAt:auction.started_at,endsAt:auction.ends_at,seller:{userIdx:Number(auction.seller_idx),nickname:auction.seller_nickname,profileImageUrl:auction.seller_profile_image,averageRating:Number(auction.seller_average_rating),reviewCount:Number(auction.seller_review_count)},highestBidder:auction.highest_bidder_idx?{userIdx:Number(auction.highest_bidder_idx),nickname:auction.highest_bidder_nickname}:null,images:auction.images.map((image)=>({imageIdx:Number(image.idx),imageUrl:image.image_url,sortOrder:Number(image.sort_order)})),bidCount:Number(auction.bid_count),favoriteCount:Number(auction.favorite_count),viewCount:Number(auction.view_count)+1,viewer:{isOwner,isFavorite:Boolean(auction.is_favorite),canEdit:isOwner&&ongoing,canDelete:isOwner,canBid:Boolean(viewerUserIdx)&&!isOwner&&ongoing,canChat:Boolean(viewerUserIdx)&&!isOwner,canFavorite:Boolean(viewerUserIdx)&&!isOwner&&ongoing},createdAt:auction.created_at,updatedAt:auction.updated_at};}

export async function updateAuction(userIdx,listingIdxValue,body,files=[]){const listingIdx=validateListingIdx(listingIdxValue),data=validateAuctionUpdate(body,files),auction=await findAuctionForMutation(listingIdx);if(!auction)throw new AppError({status:404,code:"NOT_FOUND",message:"경매를 찾을 수 없습니다."});if(Number(auction.seller_idx)!==Number(userIdx))throw new AppError({status:403,code:"FORBIDDEN",message:"판매자만 수정할 수 있습니다."});if(auction.status!=="ON_GOING"||new Date(auction.ends_at).getTime()<=Date.now())throw new AppError({status:409,code:"AUCTION_CLOSED",message:"종료된 경매는 수정할 수 없습니다."});return{listingIdx,updated:true,updatedAt:await updateAuctionRecord(listingIdx,data,imageUrls(files))};}

export async function deleteAuction(user,listingIdxValue,body){const listingIdx=validateListingIdx(listingIdxValue),{deleteReason}=validateAuctionDelete(body),auction=await findAuctionForMutation(listingIdx);if(!auction)throw new AppError({status:404,code:"NOT_FOUND",message:"경매를 찾을 수 없습니다."});if(Number(auction.seller_idx)!==Number(user.userIdx)&&user.role!=="ADMIN")throw new AppError({status:403,code:"FORBIDDEN",message:"판매자만 삭제할 수 있습니다."});const deletedAt=await softDeleteAuction(listingIdx,user.userIdx,deleteReason);cancelAuctionEnd(listingIdx);await clearAuctionCache(listingIdx);emitSafely("경매 삭제",()=>emitAuctionDeleted(listingIdx,{listingIdx,deletedAt}),{listingIdx});return{listingIdx,deleted:true,deletedAt,deletedBy:Number(user.userIdx)};}

/** 1. DB 행 잠금으로 입찰 순서를 직렬화한다. 2. commit 후 Redis cache를 갱신한다. 3. 경매방과 이전 최고 입찰자에게 Socket을 보낸다. */
export async function createAuctionBid(userIdx,listingIdxValue,body={}){const listingIdx=validateListingIdx(listingIdxValue),bidAmount=validateBidAmount(body.bidAmount);const result=await insertBid({listingIdx,bidderIdx:userIdx,bidAmount});const failures={NOT_FOUND:[404,"NOT_FOUND","경매를 찾을 수 없습니다."],CLOSED:[409,"AUCTION_CLOSED","종료된 경매입니다."],OWNER:[403,"FORBIDDEN","판매자는 본인 경매에 입찰할 수 없습니다."]};if(result.failure){if(result.failure==="TOO_LOW")throw new AppError({status:409,code:"BID_TOO_LOW",message:"최소 입찰가 이상으로 입찰해주세요.",details:{minimumBidAmount:result.minimum}});const[status,code,message]=failures[result.failure];throw new AppError({status,code,message});}
  await writeBidCache(listingIdx,userIdx,bidAmount,{currentPrice:result.currentPrice,minNextBid:result.minimumNextBid,highestBidderIdx:Number(userIdx),status:"ON_GOING"});
  const payload={listingIdx,bidIdx:Number(result.bid.idx),bidderIdx:Number(userIdx),bidAmount,currentPrice:result.currentPrice,minNextBid:result.minimumNextBid,createdAt:result.bid.created_at};
  emitSafely("입찰 갱신",()=>emitAuctionBidUpdated(listingIdx,payload),{listingIdx});
  emitSafely("최고 입찰자 갱신",()=>emitAuctionLeaderChanged(listingIdx,{listingIdx,highestBidderIdx:Number(userIdx),currentPrice:result.currentPrice}),{listingIdx});
  if(result.previous&&Number(result.previous.bidder_idx)!==Number(userIdx)){const previousIdx=Number(result.previous.bidder_idx);emitSafely("상위 입찰 알림",()=>emitAuctionOutbid(previousIdx,{listingIdx,currentPrice:result.currentPrice}),{listingIdx,previousIdx});if(result.notification){emitNotificationNew(previousIdx,result.notification);emitNotificationUnreadCount(previousIdx,{unreadCount:result.unreadCount});}}
  return payload;
}

export async function listAuctionBids(listingIdxValue,query){const listingIdx=validateListingIdx(listingIdxValue),paging=validateBidList(query),auction=await findAuctionForMutation(listingIdx);if(!auction)throw new AppError({status:404,code:"NOT_FOUND",message:"경매를 찾을 수 없습니다."});const result=await findAuctionBids({listingIdx,...paging});return{items:result.rows,page:result.page,limit:result.limit,totalCount:result.totalCount,totalPages:Math.ceil(result.totalCount/result.limit)};}
async function assertFavoriteTarget(userIdx,listingIdx){const auction=await findAuctionForMutation(listingIdx);if(!auction)throw new AppError({status:404,code:"NOT_FOUND",message:"경매를 찾을 수 없습니다."});if(Number(auction.seller_idx)===Number(userIdx))throw new AppError({status:409,code:"CONFLICT",message:"본인 경매는 관심 등록할 수 없습니다."});if(auction.status!=="ON_GOING"||new Date(auction.ends_at).getTime()<=Date.now())throw new AppError({status:409,code:"AUCTION_CLOSED",message:"진행 중인 경매만 관심 등록할 수 있습니다."});}
export async function addAuctionFavorite(userIdx,listingIdxValue){const listingIdx=validateListingIdx(listingIdxValue);await assertFavoriteTarget(userIdx,listingIdx);return{listingIdx,favorited:true,favoriteCount:await addAuctionFavoriteRow(userIdx,listingIdx)};}
export async function removeAuctionFavorite(userIdx,listingIdxValue){const listingIdx=validateListingIdx(listingIdxValue);if(!await findAuctionForMutation(listingIdx))throw new AppError({status:404,code:"NOT_FOUND",message:"경매를 찾을 수 없습니다."});return{listingIdx,favorited:false,favoriteCount:await removeAuctionFavoriteRow(userIdx,listingIdx)};}

/** 경매 종료 정본: DB 상태·낙찰 거래·알림을 먼저 commit하고 이후 Timer/Redis/Socket을 정리한다. */
export async function finalizeAuction(listingIdxValue){const listingIdx=validateListingIdx(listingIdxValue),result=await finalizeAuctionRecord(listingIdx);if(result.failure)throw new AppError({status:404,code:"NOT_FOUND",message:"경매를 찾을 수 없습니다."});if(result.alreadyFinished)return{listingIdx,alreadyFinished:true};cancelAuctionEnd(listingIdx);await clearAuctionCache(listingIdx);const payload={listingIdx,status:"FINISHED",winnerIdx:result.winner?Number(result.winner.bidder_idx):null,winningPrice:result.winner?Number(result.winner.bid_price):null,transactionIdx:result.transaction?Number(result.transaction.idx):null,endedAt:result.endedAt};emitSafely("경매 종료",()=>emitAuctionEnded(listingIdx,payload),{listingIdx});if(result.winner)emitSafely("경매 낙찰",()=>emitAuctionWon(result.winner.bidder_idx,payload),{listingIdx});for(const notification of result.notifications)emitNotificationNew(notification.receiver_idx,notification);return payload;}

/** 서버 시작 및 cron 주기마다 DB의 ON_GOING 경매를 Timer와 다시 연결한다. */
export async function recoverAuctions(){const rows=await findRecoverableAuctions();for(const row of rows){const listingIdx=Number(row.listing_idx),endsAt=new Date(row.ends_at);if(endsAt.getTime()<=Date.now()){await finalizeAuction(listingIdx);continue;}if(!hasAuctionTimer(listingIdx))scheduleAuctionEnd(listingIdx,endsAt,finalizeAuction);}return{recoveredCount:rows.length};}
export async function assertJoinableAuction(listingIdxValue){const listingIdx=validateListingIdx(listingIdxValue),auction=await findAuctionRoomState(listingIdx);if(!auction)throw new AppError({status:404,code:"NOT_FOUND",message:"경매를 찾을 수 없습니다."});return{listingIdx,status:auction.status,endsAt:auction.ends_at};}

async function writeAuctionCache(listingIdx,state){try{await getRedisClient().set(`auction:${listingIdx}:state`,JSON.stringify(state));}catch(error){log.warn("경매 Redis cache 저장에 실패했습니다.",{error,listingIdx});}}
async function writeBidCache(listingIdx,userIdx,bidAmount,state){try{const redis=getRedisClient();await redis.multi().set(`auction:${listingIdx}:state`,JSON.stringify(state)).zAdd(`auction:${listingIdx}:bidders`,{score:bidAmount,value:String(userIdx)}).exec();}catch(error){log.warn("입찰 Redis cache 저장에 실패했습니다.",{error,listingIdx});}}
async function clearAuctionCache(listingIdx){try{await getRedisClient().del([`auction:${listingIdx}:state`,`auction:${listingIdx}:bidders`]);}catch(error){log.warn("경매 Redis cache 정리에 실패했습니다.",{error,listingIdx});}}
