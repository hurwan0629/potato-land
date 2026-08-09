import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import {
  query,
  withTransaction,
} from "../../infrastructure/database/database.js";
import {
  emitUnreadCountAfterCommit,
  getUnreadNotificationCount as getUnreadNotificationCountFromDatabase,
  normalizeNotification,
  SUPPORTED_NOTIFICATION_TYPES,
} from "./notifications.service.js";

const log = logger.child("notifications-controller");

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "입력값을 확인해주세요.",
      details: { field: fieldName },
    });
  }

  return parsed;
}

function parsePagination(queryParams) {
  const page = queryParams.page === undefined
    ? 1
    : parsePositiveInteger(queryParams.page, "page");
  const limit = queryParams.limit === undefined
    ? 20
    : parsePositiveInteger(queryParams.limit, "limit");

  if (limit > 100) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "입력값을 확인해주세요.",
      details: { field: "limit" },
    });
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function parseUnreadOnly(value) {
  if (value === undefined || value === false || value === "false") {
    return false;
  }

  if (value === true || value === "true") {
    return true;
  }

  throw new AppError({
    status: 400,
    code: "VALIDATION_ERROR",
    message: "입력값을 확인해주세요.",
    details: { field: "unreadOnly" },
  });
}

export async function listNotifications(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const unreadOnly = parseUnreadOnly(req.query.unreadOnly);

  const { rows } = await query(
    `
      SELECT
        notification.idx AS "notificationIdx",
        notification.receiver_idx AS "receiverIdx",
        notification.notification_type AS "notificationType",
        notification.reference_type AS "referenceType",
        notification.reference_idx AS "referenceIdx",
        notification.content,
        notification.is_read AS "isRead",
        notification.created_at AS "createdAt",
        CASE
          WHEN notification.notification_type = 'LISTING_DELETED'
            THEN NULL
          WHEN notification.reference_type = 'CHAT_MESSAGE'
            AND chat_message.chat_room_idx IS NOT NULL
            THEN '/chat/' || chat_message.chat_room_idx
          WHEN notification.reference_type = 'CHAT_ROOM'
            THEN '/chat/' || notification.reference_idx
          WHEN notification.reference_type = 'TRANSACTION'
            THEN '/payment/' || notification.reference_idx
          WHEN notification.reference_type = 'AUCTION'
            THEN '/auction/' || notification.reference_idx
          WHEN notification.reference_type = 'LISTING'
            AND listing.listing_type = 'AUCTION'
            THEN '/auction/' || notification.reference_idx
          WHEN notification.reference_type = 'LISTING'
            THEN '/products/' || notification.reference_idx
          WHEN notification.reference_type = 'REVIEW'
            THEN '/mypage/' || notification.receiver_idx
          ELSE NULL
        END AS "targetPath"
      FROM notifications notification
      LEFT JOIN chat_messages chat_message
        ON notification.reference_type = 'CHAT_MESSAGE'
       AND chat_message.idx = notification.reference_idx
      LEFT JOIN listings listing
        ON notification.reference_type = 'LISTING'
       AND listing.idx = notification.reference_idx
      WHERE notification.receiver_idx = $1
        AND ($2::boolean = FALSE OR notification.is_read = FALSE)
      ORDER BY notification.created_at DESC, notification.idx DESC
      LIMIT $3 OFFSET $4
    `,
    [req.user.userIdx, unreadOnly, limit, offset],
  );

  const countResult = await query(
    `
      SELECT COUNT(*)::integer AS "totalCount"
      FROM notifications
      WHERE receiver_idx = $1
        AND ($2::boolean = FALSE OR is_read = FALSE)
    `,
    [req.user.userIdx, unreadOnly],
  );
  const totalCount = countResult.rows[0].totalCount;

  res.status(200).json({
    success: true,
    data: {
      items: rows.map(normalizeNotification),
      supportedNotificationTypes: SUPPORTED_NOTIFICATION_TYPES,
      page,
      limit,
      totalCount,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    },
  });
}

export async function readNotification(req, res) {
  const notificationIdx = parsePositiveInteger(
    req.params.notificationIdx,
    "notificationIdx",
  );

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `
        SELECT receiver_idx AS "receiverIdx"
        FROM notifications
        WHERE idx = $1
        FOR UPDATE
      `,
      [notificationIdx],
    );
    const notification = rows[0];

    if (!notification) {
      throw new AppError({
        status: 404,
        code: "NOT_FOUND",
        message: "알림을 찾을 수 없습니다.",
      });
    }

    if (Number(notification.receiverIdx) !== Number(req.user.userIdx)) {
      throw new AppError({
        status: 403,
        code: "FORBIDDEN",
        message: "본인의 알림만 읽음 처리할 수 있습니다.",
      });
    }

    const updated = await client.query(
      `
        UPDATE notifications
        SET
          is_read = TRUE,
          read_at = COALESCE(read_at, NOW())
        WHERE idx = $1
        RETURNING
          idx AS "notificationIdx",
          read_at AS "readAt"
      `,
      [notificationIdx],
    );

    return {
      notificationIdx: Number(updated.rows[0].notificationIdx),
      read: true,
      readAt: updated.rows[0].readAt,
    };
  });

  void emitUnreadCountAfterCommit(req.user.userIdx);
  log.info("알림을 읽음 처리했습니다.", {
    userIdx: Number(req.user.userIdx),
    notificationIdx,
  });
  res.status(200).json({ success: true, data: result });
}

export async function readAllNotifications(req, res) {
  const result = await withTransaction(async (client) => {
    const updated = await client.query(
      `
        UPDATE notifications
        SET
          is_read = TRUE,
          read_at = COALESCE(read_at, NOW())
        WHERE receiver_idx = $1
          AND is_read = FALSE
        RETURNING read_at AS "readAt"
      `,
      [req.user.userIdx],
    );

    return {
      readCount: updated.rowCount,
      readAt: updated.rows[0]?.readAt ?? new Date().toISOString(),
    };
  });

  void emitUnreadCountAfterCommit(req.user.userIdx);
  log.info("모든 알림을 읽음 처리했습니다.", {
    userIdx: Number(req.user.userIdx),
    readCount: result.readCount,
  });
  res.status(200).json({ success: true, data: result });
}

export async function getUnreadNotificationCount(req, res) {
  const unreadCount = await getUnreadNotificationCountFromDatabase(
    query,
    req.user.userIdx,
  );

  res.status(200).json({ success: true, data: { unreadCount } });
}
