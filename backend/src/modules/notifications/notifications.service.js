import { logger } from "../../common/logging/logger.js";
import { query } from "../../infrastructure/database/database.js";
import { executeQuery } from "../../infrastructure/database/executor.js";
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
  const { rows } = await executeQuery(
    executor,
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
  const { rows } = await executeQuery(
    executor,
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
        receiver_idx AS "receiverIdx",
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

/** DB와 Socket에서 넘어오는 snake_case/camelCase 알림을 하나의 DTO로 맞춘다. */
export function normalizeNotification(notification) {
  if (!notification) {
    return notification;
  }

  const notificationIdx =
    notification.notificationIdx
    ?? notification.notification_idx
    ?? notification.idx;
  const receiverIdx =
    notification.receiverIdx
    ?? notification.receiver_idx;
  const referenceIdx =
    notification.referenceIdx
    ?? notification.reference_idx;

  const referenceType =
    notification.referenceType ?? notification.reference_type;
  const normalizedReferenceIdx =
    referenceIdx == null ? null : Number(referenceIdx);
  const notificationType =
    notification.notificationType ?? notification.notification_type;
  const fallbackTargetPath = (() => {
    if (notificationType === "LISTING_DELETED") return null;
    if (normalizedReferenceIdx === null) return null;
    if (referenceType === "CHAT_ROOM") return `/chat/${normalizedReferenceIdx}`;
    if (referenceType === "TRANSACTION") return `/payment/${normalizedReferenceIdx}`;
    if (referenceType === "AUCTION") return `/auction/${normalizedReferenceIdx}`;
    if (referenceType === "LISTING") return `/products/${normalizedReferenceIdx}`;
    if (referenceType === "REVIEW" && receiverIdx != null) {
      return `/mypage/${Number(receiverIdx)}`;
    }
    return null;
  })();

  return {
    notificationIdx:
      notificationIdx === undefined ? null : Number(notificationIdx),
    receiverIdx:
      receiverIdx === undefined ? null : Number(receiverIdx),
    notificationType,
    referenceType,
    referenceIdx: normalizedReferenceIdx,
    targetPath:
      notification.targetPath
      ?? notification.target_path
      ?? fallbackTargetPath,
    content: notification.content,
    isRead: Boolean(notification.isRead ?? notification.is_read),
    createdAt: notification.createdAt ?? notification.created_at,
  };
}

export async function emitUnreadCountAfterCommit(userIdx) {
  try {
    const unreadCount = await getUnreadNotificationCount(query, userIdx);
    emitNotificationUnreadCount(userIdx, { unreadCount });
    return unreadCount;
  } catch (error) {
    log.warn("알림 미확인 수 Socket 전송에 실패했습니다.", {
      error,
      userIdx,
    });
    return null;
  }
}

export async function emitNotificationAfterCommit(userIdx, notification) {
  try {
    emitNotificationNew(userIdx, normalizeNotification(notification));
    return await emitUnreadCountAfterCommit(userIdx);
  } catch (error) {
    log.warn("알림 Socket 전송에 실패했습니다.", {
      error,
      userIdx,
    });
    return null;
  }
}
