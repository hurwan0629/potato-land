import { SOCKET_EVENT } from "../../common/constants/socketEvent.js";
import { SOCKET_ROOM } from "../../common/constants/socketRoom.js";
import { getSocketServer } from "../socket.context.js";

// 경매 입찰자 갱신
export function emitAuctionBidUpdated(listingIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.auction(listingIdx)).emit(SOCKET_EVENT.AUCTION_BID_UPDATED, payload);
}

// 경매 최고 입찰자 갱신
export function emitAuctionLeaderChanged(listingIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.auction(listingIdx)).emit(SOCKET_EVENT.AUCTION_LEADER_CHANGED, payload);
}

// 경매 종료 (어떤 방식이든)
export function emitAuctionEnded(listingIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.auction(listingIdx)).emit(SOCKET_EVENT.AUCTION_ENDED, payload);
}

// 경매 삭제됨
export function emitAuctionDeleted(listingIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.auction(listingIdx)).emit(SOCKET_EVENT.AUCTION_DELETED, payload);
}

// 경매 낙찰함 (낙찰자 본인에게 발송)
export function emitAuctionWon(winnerIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.user(winnerIdx)).emit(SOCKET_EVENT.AUCTION_WON, payload);
}

// 경매 입찰 시실ㄹ패함
export function emitAuctionOutbid(previousHighestBidderIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.user(previousHighestBidderIdx)).emit(SOCKET_EVENT.AUCTION_OUTBID, payload);
}
