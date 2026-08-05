import { notImplemented } from "../../common/utils/notImplemented.js";

export function listNotifications(req, res) {
  // TODO: unreadOnly/page/limit을 검증하고 현재 사용자의 알림과 이동 대상 reference를 최신순으로 반환한다.
  return notImplemented(res, "알림 목록 조회");
}

export function readNotification(req, res) {
  // TODO: 알림 소유자를 확인하고 is_read=true로 멱등 변경한 뒤 절대 unreadCount를 반환한다.
  return notImplemented(res, "알림 읽음 처리");
}

export function readAllNotifications(req, res) {
  // TODO: 현재 사용자의 읽지 않은 알림을 모두 is_read=true로 변경하고 unreadCount=0을 반환한다.
  return notImplemented(res, "전체 알림 읽음 처리");
}

export function getUnreadNotificationCount(req, res) {
  // TODO: 현재 사용자의 is_read=false 알림 수를 계산해 반환한다.
  return notImplemented(res, "안읽은 알림 수 조회");
}
