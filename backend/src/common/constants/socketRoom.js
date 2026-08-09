/**
 *  socket에서 관리하게 될 room들의 이름 규칙입니다.
 * 예를 들어 SOCKET_ROOM.user(12)를 하면 사용자가 스스로를 나타내는 방인 user:12 문자열 또는 설정된 값으로 나옵니다.
 * SOCKET_ROOM.chat(chatRoomIdx)
 * SOCKET_ROOM.auction(listingIdx)
 */ 
export const SOCKET_ROOM = Object.freeze({
  user: (userIdx) => `user:${userIdx}`,
  chat: (chatRoomIdx) => `chat:${chatRoomIdx}`,
  auction: (listingIdx) => `auction:${listingIdx}`,
})