import { SOCKET_EVENT } from "../common/constants/socketEvent.js";
import { notImplementedAck } from "../common/utils/notImplemented.js";

function ackNotImplemented(ack, featureName) {
  if (typeof ack === "function") {
    ack(notImplementedAck(featureName));
  }
}

export function registerAuctionSocket(_io, socket) {
  socket.on(SOCKET_EVENT.AUCTION_JOIN, (_payload, ack) => {
    // TODO: verify user and auction visibility, then join auction room.
    ackNotImplemented(ack, "경매방 입장");
  });

  socket.on(SOCKET_EVENT.AUCTION_LEAVE, (_payload, ack) => {
    // TODO: verify active auction room and leave auction room.
    ackNotImplemented(ack, "경매방 퇴장");
  });
}
