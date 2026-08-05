import { notImplemented } from "../../common/utils/notImplemented.js";

export function listChats(req, res) {
  // TODO: q/page/limit을 검증하고 상대 닉네임, 프로필, 마지막 메시지/시각, unreadCount를 포함해 내 채팅방을 조회한다.
  return notImplemented(res, "채팅방 목록 조회");
}

export function createChat(req, res) {
  // TODO: 로그인 사용자와 listing/seller 상태를 확인하고 판매자 본인 채팅을 차단한 뒤 기존 방을 재사용하거나 새 방을 만든다.
  return notImplemented(res, "채팅방 생성");
}

export function getChatDetail(req, res) {
  // TODO: 참여자 권한을 확인하고 상대 사용자와 listing 요약, canCreatePaymentRequest/readOnly 상태를 반환한다.
  return notImplemented(res, "채팅방 상세 조회");
}

export function listChatMessages(req, res) {
  // TODO: 참여자 권한과 page/limit을 검증하고 최신 메시지부터 조회해 화면에 표시할 시간순으로 반환한다.
  return notImplemented(res, "채팅 메시지 목록 조회");
}

export function uploadChatImageMessage(req, res) {
  // TODO: 참여자와 쓰기 가능 상태 및 이미지 최대 4장을 검증하고 파일별 IMAGE 메시지를 transaction으로 저장한 뒤 Socket으로 전파한다.
  return notImplemented(res, "채팅 이미지 메시지 업로드");
}
