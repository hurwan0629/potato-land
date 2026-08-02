import { notImplemented } from "../../common/utils/notImplemented.js";

export function listChats(req, res) {
  // TODO: list current user's chat rooms.
  return notImplemented(res, "채팅방 목록 조회");
}

export function createChat(req, res) {
  // TODO: create or reuse chat room after listing/user status checks.
  return notImplemented(res, "채팅방 생성");
}

export function getChatDetail(req, res) {
  // TODO: read chat room detail and read-only state.
  return notImplemented(res, "채팅방 상세 조회");
}

export function listChatMessages(req, res) {
  // TODO: read paginated chat messages.
  return notImplemented(res, "채팅 메시지 목록 조회");
}

export function uploadChatImageMessage(req, res) {
  // TODO: save chat image and create IMAGE chat message.
  return notImplemented(res, "채팅 이미지 메시지 업로드");
}
