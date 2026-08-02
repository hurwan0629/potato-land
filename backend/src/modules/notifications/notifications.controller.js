import { notImplemented } from "../../common/utils/notImplemented.js";

export function listNotifications(req, res) {
  // TODO: list notifications for current user.
  return notImplemented(res, "알림 목록 조회");
}

export function readNotification(req, res) {
  // TODO: mark one notification as read for current user.
  return notImplemented(res, "알림 읽음 처리");
}

export function readAllNotifications(req, res) {
  // TODO: mark all current user's notifications as read.
  return notImplemented(res, "전체 알림 읽음 처리");
}

export function getUnreadNotificationCount(req, res) {
  // TODO: count unread notifications for current user.
  return notImplemented(res, "안읽은 알림 수 조회");
}
