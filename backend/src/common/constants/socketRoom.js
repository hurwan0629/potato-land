export const SOCKET_ROOM = Object.freeze({
  user: (userIdx) => `user:${userIdx}`,
  chat: (chatRoomIdx) => `chat:${chatRoomIdx}`,
  auction: (listingIdx) => `auction:${listingIdx}`,
})