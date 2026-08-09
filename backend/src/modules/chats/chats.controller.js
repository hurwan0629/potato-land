import { rm } from "node:fs/promises";

import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import { query } from "../../infrastructure/database/database.js";
import {
  emitChatMessageNew,
  emitChatRoomNew,
  emitChatRoomUpdated,
} from "../../sockets/emitters/chat.emitter.js";
import { emitNotificationAfterCommit } from "../notifications/notifications.service.js";
import {
  createChatRoom,
  createImageMessages,
  getChatRoomForParticipant,
  getChatUnreadCount,
  parsePagination,
  parsePositiveInteger,
  toChatDetail,
  toChatMessageDto,
} from "./chats.service.js";

const log = logger.child("chats-controller");

function serializeListItem(row, userIdx) {
  const opponentIsSeller = Number(row.sellerIdx) !== Number(userIdx);
  const opponentActive = opponentIsSeller ? !row.sellerDeletedAt && !row.sellerBannedAt : !row.buyerDeletedAt && !row.buyerBannedAt;
  const opponentIdx = opponentIsSeller ? row.sellerIdx : row.buyerIdx;
  const opponentNickname = opponentIsSeller ? row.sellerNickname : row.buyerNickname;
  const opponentProfileImageUrl = opponentIsSeller ? row.sellerProfileImageUrl : row.buyerProfileImageUrl;

  return {
    chatRoomIdx: Number(row.chatRoomIdx),
    listingIdx: Number(row.listingIdx),
    listingTitle: row.listingTitle,
    listingThumbnailUrl: row.listingThumbnailUrl,
    opponentIdx: Number(opponentIdx),
    opponentNickname: opponentActive ? opponentNickname : "삭제된 사용자",
    opponentProfileImageUrl: opponentActive ? opponentProfileImageUrl : null,
    lastMessage: row.messageIdx
      ? {
          messageIdx: Number(row.messageIdx),
          messageType: row.messageType,
          content: row.messageContent,
          createdAt: row.messageCreatedAt,
        }
      : null,
    unreadCount: row.unreadCount,
    updatedAt: row.lastMessageAt ?? row.updatedAt,
  };
}

function roomUpdatedPayload(room, message, unreadCount) {
  return {
    chatRoomIdx: Number(room.chatRoomIdx),
    listingIdx: Number(room.listingIdx),
    lastMessage: {
      messageIdx: message.messageIdx,
      messageType: message.messageType,
      content: message.content,
      senderIdx: message.senderIdx,
      createdAt: message.createdAt,
    },
    unreadCount,
    updatedAt: message.createdAt,
  };
}

async function emitMessageAfterCommit(result) {
  try {
    emitChatMessageNew(result.message.chatRoomIdx, result.message);
    const [sellerUnreadCount, buyerUnreadCount] = await Promise.all([
      getChatUnreadCount(query, result.room.sellerIdx, result.message.chatRoomIdx),
      getChatUnreadCount(query, result.room.buyerIdx, result.message.chatRoomIdx),
    ]);
    emitChatRoomUpdated(
      result.room.sellerIdx,
      roomUpdatedPayload(result.room, result.message, sellerUnreadCount),
    );
    emitChatRoomUpdated(
      result.room.buyerIdx,
      roomUpdatedPayload(result.room, result.message, buyerUnreadCount),
    );
    if (result.notification) {
      await emitNotificationAfterCommit(result.receiverIdx, result.notification);
    }
  } catch (error) {
    log.warn("저장된 채팅 메시지의 Socket 전송에 실패했습니다.", { error });
  }
}

export async function listChats(req, res) {
  const { page, limit, offset } = parsePagination(req.query, {
    defaultLimit: 7,
    maxLimit: 100,
  });
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length > 50) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "입력값을 확인해주세요.",
      details: { field: "q" },
    });
  }

  const params = [req.user.userIdx, q, limit, offset];
  const { rows } = await query(
    `
      SELECT
        cr.idx AS "chatRoomIdx", cr.listing_idx AS "listingIdx", cr.updated_at AS "updatedAt",
        cr.last_message_at AS "lastMessageAt", l.seller_idx AS "sellerIdx", cr.buyer_idx AS "buyerIdx",
        l.title AS "listingTitle", seller.nickname AS "sellerNickname", buyer.nickname AS "buyerNickname",
        seller.profile_image AS "sellerProfileImageUrl", buyer.profile_image AS "buyerProfileImageUrl",
        seller.deleted_at AS "sellerDeletedAt", seller.banned_at AS "sellerBannedAt",
        buyer.deleted_at AS "buyerDeletedAt", buyer.banned_at AS "buyerBannedAt",
        thumbnail.image_url AS "listingThumbnailUrl", message.idx AS "messageIdx",
        message.message_type AS "messageType", message.content AS "messageContent",
        message.created_at AS "messageCreatedAt",
        (
          SELECT COUNT(*)::integer
          FROM notifications notification
          JOIN chat_messages unread_message ON unread_message.idx = notification.reference_idx
          WHERE notification.receiver_idx = $1
            AND notification.notification_type = 'NEW_MESSAGE'
            AND notification.reference_type = 'CHAT_MESSAGE'
            AND notification.is_read = FALSE
            AND unread_message.chat_room_idx = cr.idx
        ) AS "unreadCount"
      FROM chat_rooms cr
      JOIN listings l ON l.idx = cr.listing_idx
      JOIN users seller ON seller.idx = l.seller_idx
      JOIN users buyer ON buyer.idx = cr.buyer_idx
      LEFT JOIN LATERAL (
        SELECT image_url FROM post_images WHERE listing_idx = l.idx ORDER BY sort_order ASC LIMIT 1
      ) thumbnail ON TRUE
      LEFT JOIN LATERAL (
        SELECT idx, message_type, content, created_at
        FROM chat_messages WHERE chat_room_idx = cr.idx
        ORDER BY created_at DESC, idx DESC LIMIT 1
      ) message ON TRUE
      WHERE (l.seller_idx = $1 OR cr.buyer_idx = $1)
        AND (
          $2 = ''
          OR CASE WHEN l.seller_idx = $1 THEN buyer.nickname ELSE seller.nickname END ILIKE '%' || $2 || '%'
        )
      ORDER BY COALESCE(cr.last_message_at, cr.created_at) DESC, cr.idx DESC
      LIMIT $3 OFFSET $4
    `,
    params,
  );
  const countResult = await query(
    `
      SELECT COUNT(*)::integer AS "totalCount"
      FROM chat_rooms cr
      JOIN listings l ON l.idx = cr.listing_idx
      JOIN users seller ON seller.idx = l.seller_idx
      JOIN users buyer ON buyer.idx = cr.buyer_idx
      WHERE (l.seller_idx = $1 OR cr.buyer_idx = $1)
        AND (
          $2 = ''
          OR CASE WHEN l.seller_idx = $1 THEN buyer.nickname ELSE seller.nickname END ILIKE '%' || $2 || '%'
        )
    `,
    [req.user.userIdx, q],
  );
  const totalCount = countResult.rows[0].totalCount;

  res.status(200).json({
    success: true,
    data: {
      items: rows.map((row) => serializeListItem(row, req.user.userIdx)),
      page,
      limit,
      totalCount,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    },
  });
}

export async function createChat(req, res) {
  const result = await createChatRoom(req.body?.listingIdx, req.user.userIdx);
  if (result.created) {
    emitChatRoomNew(result.sellerIdx, result.roomNewPayload);
    void emitNotificationAfterCommit(result.sellerIdx, result.notification);
  }
  res.status(200).json({
    success: true,
    data: {
      chatRoomIdx: result.chatRoomIdx,
      listingIdx: result.listingIdx,
      sellerIdx: result.sellerIdx,
      buyerIdx: result.buyerIdx,
      created: result.created,
    },
  });
}

export async function getChatDetail(req, res) {
  const chatRoomIdx = parsePositiveInteger(req.params.chatRoomIdx, "chatRoomIdx");
  const room = await getChatRoomForParticipant(chatRoomIdx, req.user.userIdx);
  const unreadCount = await getChatUnreadCount(query, req.user.userIdx, chatRoomIdx);
  res.status(200).json({
    success: true,
    data: toChatDetail(room, req.user.userIdx, unreadCount),
  });
}

export async function listChatMessages(req, res) {
  const chatRoomIdx = parsePositiveInteger(req.params.chatRoomIdx, "chatRoomIdx");
  const { page, limit, offset } = parsePagination(req.query, {
    defaultLimit: 30,
    maxLimit: 100,
  });
  await getChatRoomForParticipant(chatRoomIdx, req.user.userIdx);
  const { rows } = await query(
    `
      SELECT *
      FROM (
        SELECT
          idx AS "messageIdx", chat_room_idx AS "chatRoomIdx", sender_idx AS "senderIdx",
          client_message_id AS "clientMessageId", message_type AS "messageType",
          transaction_idx AS "transactionIdx", content, image_url AS "imageUrl", created_at AS "createdAt"
        FROM chat_messages
        WHERE chat_room_idx = $1
        ORDER BY created_at DESC, idx DESC
        LIMIT $2 OFFSET $3
      ) latest
      ORDER BY "createdAt" ASC, "messageIdx" ASC
    `,
    [chatRoomIdx, limit, offset],
  );
  const countResult = await query(
    `SELECT COUNT(*)::integer AS "totalCount" FROM chat_messages WHERE chat_room_idx = $1`,
    [chatRoomIdx],
  );
  const totalCount = countResult.rows[0].totalCount;
  res.status(200).json({
    success: true,
    data: {
      items: rows.map(toChatMessageDto),
      page,
      limit,
      totalCount,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    },
  });
}

export async function uploadChatImageMessage(req, res) {
  const chatRoomIdx = parsePositiveInteger(req.params.chatRoomIdx, "chatRoomIdx");
  try {
    const result = await createImageMessages({
      io: req.app.get("io"),
      userIdx: req.user.userIdx,
      chatRoomIdx,
      files: req.files,
    });
    for (const message of result.messages) {
      void emitMessageAfterCommit({
        ...result,
        message,
        notification: message === result.messages.at(-1) ? result.notification : null,
      });
    }
    res.status(201).json({
      success: true,
      data: {
        messages: result.messages.map((message) => ({
          messageIdx: message.messageIdx,
          chatRoomIdx: message.chatRoomIdx,
          messageType: message.messageType,
          imageUrl: message.imageUrl,
          createdAt: message.createdAt,
        })),
      },
    });
  } catch (error) {
    await Promise.allSettled((req.files ?? []).map((file) => rm(file.path, { force: true })));
    throw error;
  }
}
