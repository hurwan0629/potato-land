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
