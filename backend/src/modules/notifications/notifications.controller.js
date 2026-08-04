import { AppError } from "../../common/errors/AppError.js";
import { query, withTransaction } from "../../infrastructure/database/database.js";
import {
  emitUnreadCountAfterCommit,
  getUnreadNotificationCount as getUnreadNotificationCountFromDatabase,
  normalizeNotification,
  SUPPORTED_NOTIFICATION_TYPES,
} from "./notifications.service.js";

<<<<<<< Updated upstream
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
=======
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
  const page = queryParams.page === undefined ? 1 : parsePositiveInteger(queryParams.page, "page");
  const limit = queryParams.limit === undefined ? 20 : parsePositiveInteger(queryParams.limit, "limit");
  if (limit > 100) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "입력값을 확인해주세요.",
      details: { field: "limit" },
    });
  }
  return { page, limit, offset: (page - 1) * limit };
}

function parseUnreadOnly(value) {
  if (value === undefined || value === false || value === "false") return false;
  if (value === true || value === "true") return true;
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
        idx AS "notificationIdx",
        notification_type AS "notificationType",
        reference_type AS "referenceType",
        reference_idx AS "referenceIdx",
        content,
        is_read AS "isRead",
        created_at AS "createdAt"
      FROM notifications
      WHERE receiver_idx = $1
        AND ($2::boolean = FALSE OR is_read = FALSE)
      ORDER BY created_at DESC, idx DESC
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
  const notificationIdx = parsePositiveInteger(req.params.notificationIdx, "notificationIdx");
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
      throw new AppError({ status: 404, code: "NOT_FOUND", message: "알림을 찾을 수 없습니다." });
    }
    if (Number(notification.receiverIdx) !== Number(req.user.userIdx)) {
      throw new AppError({ status: 403, code: "FORBIDDEN", message: "본인의 알림만 읽음 처리할 수 있습니다." });
    }

    const updated = await client.query(
      `
        UPDATE notifications
        SET is_read = TRUE,
            read_at = COALESCE(read_at, NOW())
        WHERE idx = $1
        RETURNING idx AS "notificationIdx", read_at AS "readAt"
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
  res.status(200).json({ success: true, data: result });
}

export async function readAllNotifications(req, res) {
  const result = await withTransaction(async (client) => {
    const updated = await client.query(
      `
        UPDATE notifications
        SET is_read = TRUE,
            read_at = NOW()
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
  res.status(200).json({ success: true, data: result });
}

export async function getUnreadNotificationCount(req, res) {
  const unreadCount = await getUnreadNotificationCountFromDatabase(query, req.user.userIdx);
  res.status(200).json({ success: true, data: { unreadCount } });
>>>>>>> Stashed changes
}
