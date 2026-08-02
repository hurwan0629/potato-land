
// [2026-08-02 21:34:22] 일단 이벤트 명 사용중에 문제 일어나지 않게 여기에 상수로 박아두기.
// 각각 채팅방/경매/알림 3가지가 있으며 
// - 경매쪽은 예외가 많아서 상대적으로 많아졌고
// - 채팅은 메시지 송신부터 is_read를 위한 chat:read 처리, updated를 통한 채팅 목록 업데이트 + new를 이용해서 방 생성 알림까지 가능
// - 알림의 경우에는 쓰임은 많지만 일단 new와 안읽은 개수 절대숫자로 보내주는 방식을 이용 (+1 이런식으로 안보냄)
export const SOCKET_EVENT = Object.freeze({
  ERROR: "error",

  CHAT_JOIN: "chat:join",
  CHAT_LEAVE: "chat:leave",
  CHAT_MESSAGE_SEND: "chat:message:send",
  CHAT_READ: "chat:read",
  CHAT_MESSAGE_NEW: "chat:message:new",
  CHAT_ROOM_NEW: "chat:room:new",
  CHAT_ROOM_UPDATED: "chat:room:updated",

  AUCTION_JOIN: "auction:join",
  AUCTION_LEAVE: "auction:leave",
  AUCTION_BID_UPDATED: "auction:bid-updated",
  AUCTION_LEADER_CHANGED: "auction:leader-changed",
  AUCTION_ENDED: "auction:ended",
  AUCTION_DELETED: "auction:deleted",
  AUCTION_WON: "auction:won",
  AUCTION_OUTBID: "auction:outbid",

  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_UNREAD_COUNT: "notification:unread-count",
});
