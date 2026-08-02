import { SOCKET_EVENT } from "../common/constants/socketEvent.js";
import { notImplementedAck } from "../common/utils/notImplemented.js";

function ackNotImplemented(ack, featureName) {
  if (typeof ack === "function") {
    ack(notImplementedAck(featureName));
  }
}

export function registerChatSocket(_io, socket) {
  socket.on(SOCKET_EVENT.CHAT_JOIN, (_payload, ack) => {
    // TODO: verify user, chat participant, read-only state, then join chat room.
    ackNotImplemented(ack, "채팅방 입장");
  });

  socket.on(SOCKET_EVENT.CHAT_LEAVE, (_payload, ack) => {
    // TODO: verify active chat room and leave chat room.
    ackNotImplemented(ack, "채팅방 퇴장");
  });

  socket.on(SOCKET_EVENT.CHAT_MESSAGE_SEND, (_payload, ack) => {
    // TODO: validate message, persist chat_messages, conditionally save notification, emit chat events.
    ackNotImplemented(ack, "채팅 메시지 전송");
  });

  socket.on(SOCKET_EVENT.CHAT_READ, (_payload, ack) => {
    // TODO: mark saved NEW_MESSAGE notifications for this chat room as read.
    ackNotImplemented(ack, "채팅 읽음 처리");
  });
}
