import { SOCKET_EVENT } from "../../common/constants/socketEvent.js";
import { logger } from "../../common/logging/logger.js";
import { SOCKET_ROOM } from "../../common/constants/socketRoom.js";
import { getSocketServer } from "../socket.context.js";

const log = logger.child("chat-emitter");

function emitSafely(room, event, payload) {
  try {
    getSocketServer().to(room).emit(event, payload);
  } catch (error) {
    // Socket 전송은 DB commit 이후의 best-effort 작업이다.
    log.warn("채팅 Socket 이벤트 전송에 실패했습니다.", { error, event, room });
  }
}

// 채팅방 메시지 생성됨
export function emitChatMessageNew(chatRoomIdx, payload) {
  emitSafely(SOCKET_ROOM.chat(chatRoomIdx), SOCKET_EVENT.CHAT_MESSAGE_NEW, payload);
}

// 채팅방 생성됨
export function emitChatRoomNew(userIdx, payload) {
  emitSafely(SOCKET_ROOM.user(userIdx), SOCKET_EVENT.CHAT_ROOM_NEW, payload);
}

// 채팅방 목록 변경 요청
export function emitChatRoomUpdated(userIdx, payload) {
  emitSafely(SOCKET_ROOM.user(userIdx), SOCKET_EVENT.CHAT_ROOM_UPDATED, payload);
}
