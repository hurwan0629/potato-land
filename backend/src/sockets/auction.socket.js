import { SOCKET_EVENT } from "../common/constants/socketEvent.js";
import { SOCKET_ROOM } from "../common/constants/socketRoom.js";
import { assertJoinableAuction } from "../modules/auctions/auctions.service.js";

function acknowledge(ack,payload){if(typeof ack==="function")ack(payload);}
function failure(error){return{success:false,code:error.code??"INTERNAL_SERVER_ERROR",message:error.message??"경매 Socket 요청에 실패했습니다."};}

export function registerAuctionSocket(_io,socket){
  socket.on(SOCKET_EVENT.AUCTION_JOIN,async(payload={},ack)=>{try{const auction=await assertJoinableAuction(payload.listingIdx);const previous=socket.data.activeAuctionListingIdx;if(previous&&Number(previous)!==auction.listingIdx)await socket.leave(SOCKET_ROOM.auction(previous));await socket.join(SOCKET_ROOM.auction(auction.listingIdx));socket.data.activeAuctionListingIdx=auction.listingIdx;acknowledge(ack,{success:true,data:auction});}catch(error){acknowledge(ack,failure(error));}});
  socket.on(SOCKET_EVENT.AUCTION_LEAVE,async(payload={},ack)=>{try{const listingIdx=Number(payload.listingIdx??socket.data.activeAuctionListingIdx);if(Number.isSafeInteger(listingIdx)&&listingIdx>0)await socket.leave(SOCKET_ROOM.auction(listingIdx));if(Number(socket.data.activeAuctionListingIdx)===listingIdx)socket.data.activeAuctionListingIdx=null;acknowledge(ack,{success:true,data:{listingIdx}});}catch(error){acknowledge(ack,failure(error));}});
}
