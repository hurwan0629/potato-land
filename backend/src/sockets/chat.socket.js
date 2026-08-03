import { SOCKET_EVENT } from "../common/constants/socketEvent.js";
import { notImplementedAck } from "../common/utils/notImplemented.js";

function ackNotImplemented(ack, featureName) {
  if (typeof ack === "function") {
    ack(notImplementedAck(featureName));
  }
}

export function registerChatSocket(_io, socket) {
  socket.on(SOCKET_EVENT.CHAT_JOIN, (_payload, ack) => {
    // TODO: 인증 사용자와 채팅 참여자를 확인하고 기존 활성 room을 나간 뒤 요청한 채팅 room에 가입한다.
    ackNotImplemented(ack, "채팅방 입장");
  });

  socket.on(SOCKET_EVENT.CHAT_LEAVE, (_payload, ack) => {
    // TODO: 현재 활성 채팅방과 요청 ID가 같은지 확인하고 room을 나간 뒤 activeChatRoomIdx를 비운다.
    ackNotImplemented(ack, "채팅방 퇴장");
  });

  socket.on(SOCKET_EVENT.CHAT_MESSAGE_SEND, (_payload, ack) => {
    // TODO: payload/참여/쓰기 상태를 검증하고 메시지와 조건부 알림을 저장한 뒤 commit 후 새 메시지 이벤트를 보낸다.
    ackNotImplemented(ack, "채팅 메시지 전송");
  });

  socket.on(SOCKET_EVENT.CHAT_READ, (_payload, ack) => {
    // TODO: 참여자를 확인하고 이 채팅방의 저장된 NEW_MESSAGE 알림을 읽음 처리한 뒤 절대 미확인 개수를 보낸다.
    ackNotImplemented(ack, "채팅 읽음 처리");
  });
}
