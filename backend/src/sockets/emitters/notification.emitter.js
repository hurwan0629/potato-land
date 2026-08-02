import { SOCKET_EVENT } from "../../common/constants/socketEvent.js";
import { SOCKET_ROOM } from "../../common/constants/socketRoom.js";
import { getSocketServer } from "../socket.context.js";

// 아래 안읽은 알림 개수와 함께 알림을 보내게 됨
export function emitNotificationNew(userIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.user(userIdx)).emit(SOCKET_EVENT.NOTIFICATION_NEW, payload);
}

// 위에 존재하는 알람 1개의 내용과 함께 안읽은 알람 개수를 보내게 됨
export function emitNotificationUnreadCount(userIdx, payload) {
  getSocketServer().to(SOCKET_ROOM.user(userIdx)).emit(SOCKET_EVENT.NOTIFICATION_UNREAD_COUNT, payload);
}
