import { SOCKET_EVENT } from "../common/constants/socketEvent.js";
import { SOCKET_ROOM } from "../common/constants/socketRoom.js";
import { assertJoinableAuction } from "../modules/auctions/auctions.service.js";

/** Socket.IO ack 콜백이 전달된 경우에만 응답 payload를 보낸다. */
function acknowledge(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

/** 경매 소켓 오류를 클라이언트 공통 응답 형태로 변환한다. */
function failure(error) {
  return {
    success: false,
    code: error.code ?? "INTERNAL_SERVER_ERROR",
    message: error.message ?? "경매 Socket 요청에 실패했습니다.",
  };
}

/** 경매방 입장과 퇴장 이벤트를 현재 socket에 등록한다. */
export function registerAuctionSocket(_io, socket) {
  socket.on(SOCKET_EVENT.AUCTION_JOIN, async (payload = {}, ack) => {
    try {
      // 1. 입장 가능한 경매인지 확인하고 이전에 참여 중이던 경매방을 찾는다.
      const auction = await assertJoinableAuction(payload.listingIdx);
      const previous = socket.data.activeAuctionListingIdx;

      // 2. 사용자가 다른 경매방에 있었다면 먼저 기존 방에서 제거한다.
      if (previous && Number(previous) !== auction.listingIdx) {
        await socket.leave(SOCKET_ROOM.auction(previous));
      }

      // 3. 현재 경매방에 참가시키고 socket data에 활성 경매를 기록한다.
      await socket.join(SOCKET_ROOM.auction(auction.listingIdx));

      socket.data.activeAuctionListingIdx = auction.listingIdx;
      acknowledge(ack, { success: true, data: auction });
    } catch (error) {
      acknowledge(ack, failure(error));
    }
  });

  socket.on(SOCKET_EVENT.AUCTION_LEAVE, async (payload = {}, ack) => {
    try {
      // 1. 요청 payload가 없으면 socket data의 현재 경매방을 퇴장 대상으로 사용한다.
      const listingIdx = Number(
        payload.listingIdx ?? socket.data.activeAuctionListingIdx,
      );

      // 2. 유효한 경매 식별자일 때만 Socket.IO room에서 제거한다.
      if (Number.isSafeInteger(listingIdx) && listingIdx > 0) {
        await socket.leave(SOCKET_ROOM.auction(listingIdx));
      }

      // 3. 활성 경매방과 같은 방을 떠났다면 socket data도 비운다.
      if (Number(socket.data.activeAuctionListingIdx) === listingIdx) {
        socket.data.activeAuctionListingIdx = null;
      }

      acknowledge(ack, {
        success: true,
        data: { listingIdx },
      });
    } catch (error) {
      acknowledge(ack, failure(error));
    }
  });
}
