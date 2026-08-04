import { logger } from "../../common/logging/logger.js";
import { query } from "../../infrastructure/database/database.js";
import {
  emitNotificationNew,
  emitNotificationUnreadCount,
} from "../../sockets/emitters/notification.emitter.js";

const log = logger.child("notification-service");

export const SUPPORTED_NOTIFICATION_TYPES = Object.freeze([
  "NEW_CHAT_ROOM",
  "NEW_MESSAGE",
  "NEW_BID",
  "OUTBID",
  "AUCTION_WON",
  "AUCTION_ENDED",
  "AUCTION_ENDED_WITHOUT_BID",
  "AUCTION_LEADER_CHANGED",
  "LISTING_DELETED",
  "PAYMENT_REQUESTED",
  "PAYMENT_RECEIVED",
  "PAYMENT_CANCELED",
  "NEW_REVIEW",
]);

export async function getUnreadNotificationCount(executor, userIdx) {
  const { rows } = await executor.query(
    `
      SELECT COUNT(*)::integer AS "unreadCount"
      FROM notifications
      WHERE receiver_idx = $1
        AND is_read = FALSE
    `,
    [userIdx],
  );

  return rows[0].unreadCount;
}

export async function createNotification(
  executor,
  { receiverIdx, notificationType, referenceType, referenceIdx, content },
) {
  const { rows } = await executor.query(
    `
      INSERT INTO notifications (
        receiver_idx,
        notification_type,
        reference_type,
        reference_idx,
        content
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        idx AS "notificationIdx",
        notification_type AS "notificationType",
        reference_type AS "referenceType",
        reference_idx AS "referenceIdx",
        content,
        is_read AS "isRead",
        created_at AS "createdAt"
    `,
    [receiverIdx, notificationType, referenceType, referenceIdx, content],
  );

  return normalizeNotification(rows[0]);
}

export function normalizeNotification(notification) {
  if (!notification) return notification;

  return {
    ...notification,
    notificationIdx: Number(notification.notificationIdx),
    referenceIdx: Number(notification.referenceIdx),
  };
}

export async function emitUnreadCountAfterCommit(userIdx) {
  try {
    const unreadCount = await getUnreadNotificationCount(query, userIdx);
    emitNotificationUnreadCount(userIdx, { unreadCount });
    return unreadCount;
  } catch (error) {
    log.warn("알림 미확인 수 Socket 전송에 실패했습니다.", { error, userIdx });
    return null;
  }
}

export async function emitNotificationAfterCommit(userIdx, notification) {
  try {
    emitNotificationNew(userIdx, normalizeNotification(notification));
    return await emitUnreadCountAfterCommit(userIdx);
  } catch (error) {
    log.warn("알림 Socket 전송에 실패했습니다.", { error, userIdx });
    return null;
  }
}
