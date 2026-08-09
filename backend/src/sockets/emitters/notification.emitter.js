import { SOCKET_EVENT } from "../../common/constants/socketEvent.js";
import { logger } from "../../common/logging/logger.js";
import { SOCKET_ROOM } from "../../common/constants/socketRoom.js";
import { getSocketServer } from "../socket.context.js";

const log = logger.child("notification-emitter");

function emitSafely(userIdx, event, payload) {
  try {
    getSocketServer().to(SOCKET_ROOM.user(userIdx)).emit(event, payload);
  } catch (error) {
    // Socket 실패가 이미 저장된 알림 데이터를 바꾸면 안 된다.
    log.warn("알림 Socket 이벤트 전송에 실패했습니다.", { error, event, userIdx });
  }
}

// 아래 안읽은 알림 개수와 함께 알림을 보내게 됨
export function emitNotificationNew(userIdx, payload) {
  emitSafely(userIdx, SOCKET_EVENT.NOTIFICATION_NEW, payload);
}

// 위에 존재하는 알람 1개의 내용과 함께 안읽은 알람 개수를 보내게 됨
export function emitNotificationUnreadCount(userIdx, payload) {
  emitSafely(userIdx, SOCKET_EVENT.NOTIFICATION_UNREAD_COUNT, payload);
}
