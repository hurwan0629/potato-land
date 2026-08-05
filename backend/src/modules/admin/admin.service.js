import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import { getRedisClient } from "../../infrastructure/redis/redisClient.js";
import { cancelAuctionEnd } from "../../schedulers/auctionTimer.js";
import { deleteAllRefreshSessions } from "../auth/auth.redis.js";
import { deleteAuction } from "../auctions/auctions.service.js";
import { deleteUsedListing } from "../used/used.service.js";
import {
  banUserCascade,
  findAdminListings,
  findAdminUserDetail,
  findAuctionWinners,
  findDashboard,
  findUserReviewActivity,
  findUserTransactions,
  findUsers,
  updateAdminMemo,
} from "./admin.repository.js";

const log = logger.child("admin-service");

function positiveInt(value, field) {
  const n=Number(value); if(!Number.isSafeInteger(n)||n<=0) throw new AppError({status:400,code:"VALIDATION_ERROR",message:"요청 정보를 확인해주세요.",details:{field}}); return n;
}
function paging(query={},fallback=20){const page=Number(query.page??1),limit=Number(query.limit??fallback);if(!Number.isSafeInteger(page)||page<=0||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new AppError({status:400,code:"VALIDATION_ERROR",message:"페이지 조건을 확인해주세요."});return{page,limit,offset:(page-1)*limit};}
function paged(result,p){return{items:result.rows,page:p.page,limit:p.limit,totalCount:result.totalCount,totalPages:Math.ceil(result.totalCount/p.limit)};}

export async function getDashboard(query={}){
  const interval=String(query.interval??"DAY").toUpperCase();
  const to=query.to?new Date(query.to):new Date();
  const from=query.from?new Date(query.from):new Date(to.getTime()-6*24*60*60*1000);
  if(!["DAY","HOUR"].includes(interval)||Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||from>=to)throw new AppError({status:400,code:"VALIDATION_ERROR",message:"대시보드 기간을 확인해주세요."});
  return findDashboard({from,to,interval});
}
export async function listUsers(query={}){const p=paging(query,20);const status=String(query.status??"ALL").toUpperCase();if(!["ALL","ACTIVE","BANNED","WITHDRAWN"].includes(status))throw new AppError({status:400,code:"VALIDATION_ERROR",message:"회원 상태를 확인해주세요."});return paged(await findUsers({q:String(query.q??"").trim(),status,...p}),p);}
export async function getUser(userIdxValue){const user=await findAdminUserDetail(positiveInt(userIdxValue,"userIdx"));if(!user)throw new AppError({status:404,code:"NOT_FOUND",message:"회원을 찾을 수 없습니다."});return{...user,averageRating:Number(user.averageRating)};}
export async function updateUserMemo(userIdxValue,body={}){const userIdx=positiveInt(userIdxValue,"userIdx");const memo=body.memo==null?"":String(body.memo).trim();if(memo.length>1000)throw new AppError({status:400,code:"VALIDATION_ERROR",message:"관리자 메모는 1000자 이하여야 합니다."});const row=await updateAdminMemo(userIdx,memo);if(!row)throw new AppError({status:404,code:"NOT_FOUND",message:"회원을 찾을 수 없습니다."});return{userIdx,adminMemo:row.admin_memo,updatedAt:row.updated_at};}
export async function listAdminListings(listingType,query={}){const p=paging(query,20);return paged(await findAdminListings({listingType,q:String(query.q??"").trim(),...p}),p);}
export async function listWinners(query={}){const p=paging(query,20);return paged(await findAuctionWinners(p),p);}
export async function listTransactions(userIdxValue,query={}){const p=paging(query,20);return paged(await findUserTransactions(positiveInt(userIdxValue,"userIdx"),p),p);}
export async function listReviews(userIdxValue,query={}){const p=paging(query,20);return paged(await findUserReviewActivity(positiveInt(userIdxValue,"userIdx"),p),p);}
export async function deleteUsed(admin,listingIdx,body){return deleteUsedListing(admin,listingIdx,body);}
export async function deleteAuctionForAdmin(admin,listingIdx,body){return deleteAuction(admin,listingIdx,body);}

/** 1. 관리자 본인 정지를 차단한다. 2. DB 상태를 한 transaction에서 정리한다. 3. commit 후 session·Timer·Redis를 정리한다. */
export async function banUser(adminUserIdx,userIdxValue,body={}){
  const userIdx=positiveInt(userIdxValue,"userIdx");
  if(Number(adminUserIdx)===userIdx)throw new AppError({status:409,code:"CONFLICT",message:"본인 계정은 정지할 수 없습니다."});
  const reason=typeof body.reason==="string"?body.reason.trim():"";
  if(!reason||reason.length>500)throw new AppError({status:400,code:"VALIDATION_ERROR",message:"정지 사유를 1~500자로 입력해주세요.",details:{field:"reason"}});
  const result=await banUserCascade(userIdx,reason);
  const failures={NOT_FOUND:[404,"NOT_FOUND","회원을 찾을 수 없습니다."],WITHDRAWN:[409,"CONFLICT","탈퇴한 회원은 정지할 수 없습니다."],ALREADY_BANNED:[409,"CONFLICT","이미 정지된 회원입니다."]};
  if(result.failure){const [status,code,message]=failures[result.failure];throw new AppError({status,code,message});}
  await deleteAllRefreshSessions(userIdx);
  for(const idx of result.ownedAuctionIdxs)cancelAuctionEnd(idx);
  try{const redis=getRedisClient();const keys=[...new Set([...result.ownedAuctionIdxs,...result.affectedAuctionIdxs])].flatMap((idx)=>[`auction:${idx}:state`,`auction:${idx}:bidders`]);if(keys.length)await redis.del(keys);}catch(error){log.warn("정지 사용자의 Redis 상태 정리에 실패했습니다.",{error,userIdx});}
  return{userIdx,banned:true,...result};
}
