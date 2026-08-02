import { SOCKET_EVENT } from "../../common/constants/socketEvent.js";
import { SOCKET_ROOM } from "../../common/constants/socketRoom.js";
import { getSocketServer } from "../socket.context.js";

// 채팅방 메시지 생성됨
export function emitChatMessageNew(chatRoomIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.chat(chatRoomIdx)).emit(SOCKET_EVENT.CHAT_MESSAGE_NEW, payload);
}

// 채팅방 생성됨
export function emitChatRoomNew(userIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.user(userIdx)).emit(SOCKET_EVENT.CHAT_ROOM_NEW, payload);
}

// 채팅방 목록 변경 요청
export function emitChatRoomUpdated(userIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.user(userIdx)).emit(SOCKET_EVENT.CHAT_ROOM_UPDATED, payload);
}
