import { SOCKET_EVENT } from "../common/constants/socketEvent.js";
import { notImplementedAck } from "../common/utils/notImplemented.js";

function ackNotImplemented(ack, featureName) {
  if (typeof ack === "function") {
    ack(notImplementedAck(featureName));
  }
}

export function registerAuctionSocket(_io, socket) {
  socket.on(SOCKET_EVENT.AUCTION_JOIN, (_payload, ack) => {
    // TODO: 인증 사용자와 삭제되지 않은 경매를 확인하고 기존 활성 room을 나간 뒤 경매 room에 가입한다.
    ackNotImplemented(ack, "경매방 입장");
  });

  socket.on(SOCKET_EVENT.AUCTION_LEAVE, (_payload, ack) => {
    // TODO: 현재 활성 경매와 요청 ID가 같은지 확인하고 room을 나간 뒤 activeAuctionListingIdx를 비운다.
    ackNotImplemented(ack, "경매방 퇴장");
  });
}
