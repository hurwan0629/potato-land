import { AppError } from "../../common/errors/AppError.js";
import { query, withTransaction } from "../../infrastructure/database/database.js";
import {
  createNotification,
  getUnreadNotificationCount,
} from "../notifications/notifications.service.js";

function toId(value) {
  return Number(value);
}

function isUserActive(user) {
  return !user.deletedAt && !user.bannedAt;
}

function notFound(message) {
  return new AppError({ status: 404, code: "NOT_FOUND", message });
}

function forbidden(message) {
  return new AppError({ status: 403, code: "FORBIDDEN", message });
}

function conflict(code, message) {
  return new AppError({ status: 409, code, message });
}

export function parsePositiveInteger(value, fieldName) {
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

export function parsePagination(queryParams, { defaultLimit, maxLimit }) {
  const page = queryParams.page === undefined ? 1 : parsePositiveInteger(queryParams.page, "page");
  const limit = queryParams.limit === undefined ? defaultLimit : parsePositiveInteger(queryParams.limit, "limit");
  if (limit > maxLimit) {
    throw new AppError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "입력값을 확인해주세요.",
      details: { field: "limit" },
    });
  }
  return { page, limit, offset: (page - 1) * limit };
}

export async function getChatRoom(chatRoomIdx, executor = query) {
  const { rows } = await executor.query(
    `
      SELECT
        cr.idx AS "chatRoomIdx", cr.listing_idx AS "listingIdx", cr.buyer_idx AS "buyerIdx",
        cr.created_at AS "createdAt", cr.updated_at AS "updatedAt", cr.last_message_at AS "lastMessageAt",
        l.seller_idx AS "sellerIdx", l.listing_type AS "listingType", l.title AS "listingTitle",
        l.deleted_at AS "listingDeletedAt",
        seller.idx AS "sellerUserIdx", seller.nickname AS "sellerNickname",
        seller.profile_image AS "sellerProfileImageUrl", seller.deleted_at AS "sellerDeletedAt",
        seller.banned_at AS "sellerBannedAt",
        buyer.idx AS "buyerUserIdx", buyer.nickname AS "buyerNickname",
        buyer.profile_image AS "buyerProfileImageUrl", buyer.deleted_at AS "buyerDeletedAt",
        buyer.banned_at AS "buyerBannedAt",
        used_post.price AS "usedPrice", used_post.trade_status AS "usedTradeStatus",
        auction_post.current_price AS "auctionCurrentPrice", auction_post.status AS "auctionStatus",
        auction_post.ends_at AS "auctionEndsAt",
        active_transaction.idx AS "transactionIdx", active_transaction.status AS "transactionStatus",
        thumbnail.image_url AS "listingThumbnailUrl"
      FROM chat_rooms cr
      JOIN listings l ON l.idx = cr.listing_idx
      JOIN users seller ON seller.idx = l.seller_idx
      JOIN users buyer ON buyer.idx = cr.buyer_idx
      LEFT JOIN used_posts used_post ON used_post.listing_idx = l.idx
      LEFT JOIN auction_posts auction_post ON auction_post.listing_idx = l.idx
      LEFT JOIN LATERAL (
        SELECT idx, status
        FROM transactions
        WHERE listing_idx = l.idx
          AND seller_idx = l.seller_idx
          AND buyer_idx = cr.buyer_idx
          AND status IN ('REQUESTED', 'COMPLETED')
        ORDER BY created_at DESC
        LIMIT 1
      ) active_transaction ON TRUE
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM post_images
        WHERE listing_idx = l.idx
        ORDER BY sort_order ASC
        LIMIT 1
      ) thumbnail ON TRUE
      WHERE cr.idx = $1
    `,
    [chatRoomIdx],
  );
  return rows[0] ?? null;
}

export async function getChatRoomForParticipant(chatRoomIdx, userIdx, executor = query) {
  const room = await getChatRoom(chatRoomIdx, executor);
  if (!room) throw notFound("채팅방을 찾을 수 없습니다.");
  if (toId(room.sellerIdx) !== Number(userIdx) && toId(room.buyerIdx) !== Number(userIdx)) {
    throw forbidden("채팅방 참여자만 접근할 수 있습니다.");
  }
  return room;
}

export function getChatWriteState(room) {
  const seller = { deletedAt: room.sellerDeletedAt, bannedAt: room.sellerBannedAt };
  const buyer = { deletedAt: room.buyerDeletedAt, bannedAt: room.buyerBannedAt };
  if (!isUserActive(seller) || !isUserActive(buyer)) {
    return { canSendMessage: false, readOnlyReason: "INACTIVE_USER", message: "비활성화된 사용자가 포함된 채팅방입니다." };
  }
  if (room.listingDeletedAt) {
    return { canSendMessage: false, readOnlyReason: "LISTING_DELETED", message: "삭제된 게시글의 채팅방입니다." };
  }
  if (room.listingType === "USED" && room.usedTradeStatus === "ON_SALE") {
    return { canSendMessage: true, readOnlyReason: null, message: null };
  }
  if (room.listingType === "AUCTION" && room.auctionStatus === "ON_GOING" && room.auctionEndsAt && new Date(room.auctionEndsAt).getTime() > Date.now()) {
    return { canSendMessage: true, readOnlyReason: null, message: null };
  }
  if (room.listingType === "AUCTION" && room.auctionStatus === "FINISHED" && room.transactionStatus === "REQUESTED") {
    return { canSendMessage: true, readOnlyReason: null, message: null };
  }
  return {
    canSendMessage: false,
    readOnlyReason: room.listingType === "AUCTION" ? "AUCTION_CLOSED" : "TRADE_CLOSED",
    message: room.listingType === "AUCTION" ? "종료된 경매의 일반 채팅방입니다." : "거래가 종료된 채팅방입니다.",
  };
}

export function assertChatWritable(room) {
  const writeState = getChatWriteState(room);
  if (writeState.canSendMessage) return;
  throw conflict(writeState.readOnlyReason === "INACTIVE_USER" ? "INACTIVE_USER" : "READ_ONLY_CHAT", writeState.message);
}

export async function getChatUnreadCount(executor, userIdx, chatRoomIdx) {
  const { rows } = await executor.query(
    `
      SELECT COUNT(*)::integer AS "unreadCount"
      FROM notifications notification
      JOIN chat_messages message ON message.idx = notification.reference_idx
      WHERE notification.receiver_idx = $1
        AND notification.notification_type = 'NEW_MESSAGE'
        AND notification.reference_type = 'CHAT_MESSAGE'
        AND notification.is_read = FALSE
        AND message.chat_room_idx = $2
    `,
    [userIdx, chatRoomIdx],
  );
  return rows[0].unreadCount;
}

export async function markChatNotificationsRead(executor, userIdx, chatRoomIdx) {
  await executor.query(
    `
      UPDATE notifications notification
      SET is_read = TRUE, read_at = COALESCE(notification.read_at, NOW())
      FROM chat_messages message
      WHERE notification.receiver_idx = $1
        AND notification.notification_type = 'NEW_MESSAGE'
        AND notification.reference_type = 'CHAT_MESSAGE'
        AND notification.reference_idx = message.idx
        AND message.chat_room_idx = $2
        AND notification.is_read = FALSE
    `,
    [userIdx, chatRoomIdx],
  );
  return getUnreadNotificationCount(executor, userIdx);
}

export async function createChatRoom(listingIdx, buyerIdx) {
  const listingId = parsePositiveInteger(listingIdx, "listingIdx");
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `
        SELECT
          l.idx AS "listingIdx", l.seller_idx AS "sellerIdx", l.listing_type AS "listingType",
          l.title AS "listingTitle", l.deleted_at AS "listingDeletedAt",
          seller.deleted_at AS "sellerDeletedAt", seller.banned_at AS "sellerBannedAt",
          buyer.nickname AS "buyerNickname",
          used_post.trade_status AS "usedTradeStatus", auction_post.status AS "auctionStatus",
          auction_post.ends_at AS "auctionEndsAt", thumbnail.image_url AS "listingThumbnailUrl"
        FROM listings l
        JOIN users seller ON seller.idx = l.seller_idx
        JOIN users buyer ON buyer.idx = $2
        LEFT JOIN used_posts used_post ON used_post.listing_idx = l.idx
        LEFT JOIN auction_posts auction_post ON auction_post.listing_idx = l.idx
        LEFT JOIN LATERAL (
          SELECT image_url FROM post_images WHERE listing_idx = l.idx ORDER BY sort_order ASC LIMIT 1
        ) thumbnail ON TRUE
        WHERE l.idx = $1
      `,
      [listingId, buyerIdx],
    );
    const listing = rows[0];
    if (!listing || listing.listingDeletedAt) throw notFound("게시글을 찾을 수 없습니다.");
    if (toId(listing.sellerIdx) === Number(buyerIdx)) throw forbidden("본인 게시글에는 채팅을 만들 수 없습니다.");
    if (listing.sellerDeletedAt || listing.sellerBannedAt) throw conflict("INACTIVE_USER", "비활성화된 사용자와 새 채팅방을 만들 수 없습니다.");
    if (listing.listingType === "USED" && listing.usedTradeStatus !== "ON_SALE") throw conflict("CONFLICT", "거래가 종료된 게시글에는 채팅을 만들 수 없습니다.");
    if (listing.listingType === "AUCTION" && (listing.auctionStatus !== "ON_GOING" || !listing.auctionEndsAt || new Date(listing.auctionEndsAt).getTime() <= Date.now())) {
      throw conflict("AUCTION_CLOSED", "종료된 경매는 채팅을 시작할 수 없습니다.");
    }

    const inserted = await client.query(
      `
        INSERT INTO chat_rooms (listing_idx, buyer_idx)
        VALUES ($1, $2)
        ON CONFLICT (listing_idx, buyer_idx) DO NOTHING
        RETURNING idx AS "chatRoomIdx", created_at AS "createdAt"
      `,
      [listingId, buyerIdx],
    );
    const created = inserted.rowCount === 1;
    const chatRoom = inserted.rows[0] ?? (await client.query(
      `SELECT idx AS "chatRoomIdx", created_at AS "createdAt" FROM chat_rooms WHERE listing_idx = $1 AND buyer_idx = $2`,
      [listingId, buyerIdx],
    )).rows[0];
    const notification = created ? await createNotification(client, {
      receiverIdx: listing.sellerIdx,
      notificationType: "NEW_CHAT_ROOM",
      referenceType: "CHAT_ROOM",
      referenceIdx: chatRoom.chatRoomIdx,
      content: "새 채팅방이 생성되었습니다.",
    }) : null;

    return {
      chatRoomIdx: toId(chatRoom.chatRoomIdx), listingIdx: toId(listing.listingIdx), sellerIdx: toId(listing.sellerIdx), buyerIdx: Number(buyerIdx), created, notification,
      roomNewPayload: {
        chatRoomIdx: toId(chatRoom.chatRoomIdx), listingIdx: toId(listing.listingIdx), listingTitle: listing.listingTitle,
        listingThumbnailUrl: listing.listingThumbnailUrl, opponentIdx: Number(buyerIdx), opponentNickname: listing.buyerNickname,
        lastMessage: null, unreadCount: 0, createdAt: chatRoom.createdAt,
      },
    };
  });
}

function messageDto(message, room) {
  const senderIsSeller = message.senderIdx !== null && Number(message.senderIdx) === toId(room.sellerIdx);
  const senderNickname = senderIsSeller ? room.sellerNickname : room.buyerNickname;
  const senderProfileImageUrl = senderIsSeller ? room.sellerProfileImageUrl : room.buyerProfileImageUrl;
  return {
    messageIdx: toId(message.messageIdx), chatRoomIdx: toId(message.chatRoomIdx),
    senderIdx: message.senderIdx === null ? null : toId(message.senderIdx),
    senderNickname: message.senderIdx === null ? null : senderNickname,
    senderProfileImageUrl: message.senderIdx === null ? null : senderProfileImageUrl,
    messageType: message.messageType, content: message.content, clientMessageId: message.clientMessageId,
    imageUrl: message.imageUrl, transactionIdx: message.transactionIdx === null ? null : toId(message.transactionIdx),
    createdAt: message.createdAt,
  };
}

function getReceiverIdx(room, senderIdx) {
  return toId(room.sellerIdx) === Number(senderIdx) ? toId(room.buyerIdx) : toId(room.sellerIdx);
}

export function isRecipientViewingChat(io, receiverIdx, chatRoomIdx) {
  if (!io?.sockets?.sockets) return false;
  for (const socket of io.sockets.sockets.values()) {
    if (Number(socket.data.user?.userIdx) === Number(receiverIdx) && Number(socket.data.activeChatRoomIdx) === Number(chatRoomIdx)) return true;
  }
  return false;
}

export async function createTextMessage({ io, userIdx, payload }) {
  const chatRoomIdx = parsePositiveInteger(payload?.chatRoomIdx, "chatRoomIdx");
  const clientMessageId = payload?.clientMessageId;
  const content = typeof payload?.content === "string" ? payload.content.trim() : "";
  if (payload?.messageType !== "TEXT" || typeof clientMessageId !== "string" || clientMessageId.trim() === "" || clientMessageId.length > 100 || content === "" || content.length > 2000) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "메시지 입력값을 확인해주세요." });
  }
  return withTransaction(async (client) => {
    const room = await getChatRoomForParticipant(chatRoomIdx, userIdx, client);
    assertChatWritable(room);
    const existing = await client.query(
      `
        SELECT idx AS "messageIdx", chat_room_idx AS "chatRoomIdx", sender_idx AS "senderIdx",
          client_message_id AS "clientMessageId", message_type AS "messageType", transaction_idx AS "transactionIdx",
          content, image_url AS "imageUrl", created_at AS "createdAt"
        FROM chat_messages
        WHERE chat_room_idx = $1 AND sender_idx = $2 AND client_message_id = $3
      `,
      [chatRoomIdx, userIdx, clientMessageId],
    );
    if (existing.rowCount === 1) return { created: false, room, message: messageDto(existing.rows[0], room), notification: null };
    const inserted = await client.query(
      `
        INSERT INTO chat_messages (chat_room_idx, sender_idx, client_message_id, message_type, content)
        VALUES ($1, $2, $3, 'TEXT', $4)
        RETURNING idx AS "messageIdx", chat_room_idx AS "chatRoomIdx", sender_idx AS "senderIdx",
          client_message_id AS "clientMessageId", message_type AS "messageType", transaction_idx AS "transactionIdx",
          content, image_url AS "imageUrl", created_at AS "createdAt"
      `,
      [chatRoomIdx, userIdx, clientMessageId, content],
    );
    const message = messageDto(inserted.rows[0], room);
    await client.query(`UPDATE chat_rooms SET updated_at = NOW(), last_message_at = $2 WHERE idx = $1`, [chatRoomIdx, message.createdAt]);
    const receiverIdx = getReceiverIdx(room, userIdx);
    const notification = isRecipientViewingChat(io, receiverIdx, chatRoomIdx) ? null : await createNotification(client, {
      receiverIdx, notificationType: "NEW_MESSAGE", referenceType: "CHAT_MESSAGE", referenceIdx: message.messageIdx, content: "새 메시지가 도착했습니다.",
    });
    return { created: true, room, message, notification, receiverIdx };
  });
}

export async function createImageMessages({ io, userIdx, chatRoomIdx, files }) {
  const roomId = parsePositiveInteger(chatRoomIdx, "chatRoomIdx");
  if (!Array.isArray(files) || files.length === 0 || files.length > 4) {
    throw new AppError({ status: 400, code: "UPLOAD_FAILED", message: "채팅 이미지 업로드에 실패했습니다." });
  }
  return withTransaction(async (client) => {
    const room = await getChatRoomForParticipant(roomId, userIdx, client);
    assertChatWritable(room);
    const messages = [];
    for (const file of files) {
      const { rows } = await client.query(
        `
          INSERT INTO chat_messages (chat_room_idx, sender_idx, message_type, content, image_url)
          VALUES ($1, $2, 'IMAGE', '', $3)
          RETURNING idx AS "messageIdx", chat_room_idx AS "chatRoomIdx", sender_idx AS "senderIdx",
            client_message_id AS "clientMessageId", message_type AS "messageType", transaction_idx AS "transactionIdx",
            content, image_url AS "imageUrl", created_at AS "createdAt"
        `,
        [roomId, userIdx, file.resourceUrl],
      );
      messages.push(messageDto(rows[0], room));
    }
    await client.query(`UPDATE chat_rooms SET updated_at = NOW(), last_message_at = $2 WHERE idx = $1`, [roomId, messages.at(-1).createdAt]);
    const receiverIdx = getReceiverIdx(room, userIdx);
    const notification = isRecipientViewingChat(io, receiverIdx, roomId) ? null : await createNotification(client, {
      receiverIdx, notificationType: "NEW_MESSAGE", referenceType: "CHAT_MESSAGE", referenceIdx: messages.at(-1).messageIdx, content: "새 이미지가 도착했습니다.",
    });
    return { room, messages, notification, receiverIdx };
  });
}

export function toChatDetail(room, currentUserIdx, unreadCount) {
  const writeState = getChatWriteState(room);
  const sellerActive = isUserActive({ deletedAt: room.sellerDeletedAt, bannedAt: room.sellerBannedAt });
  const buyerActive = isUserActive({ deletedAt: room.buyerDeletedAt, bannedAt: room.buyerBannedAt });
  const person = (userIdx, nickname, profileImageUrl, active) => ({
    userIdx: toId(userIdx), nickname: active ? nickname : "삭제된 사용자", displayName: active ? nickname : "삭제된 사용자",
    profileImageUrl: active ? profileImageUrl : null, profileEnabled: active,
  });
  const canCreatePaymentRequest = Number(currentUserIdx) === toId(room.sellerIdx) && !room.transactionIdx && !room.listingDeletedAt && sellerActive && buyerActive && room.listingType === "USED" && room.usedTradeStatus === "ON_SALE";
  const displayPrice = room.listingType === "USED" ? room.usedPrice : room.auctionCurrentPrice;
  return {
    chatRoomIdx: toId(room.chatRoomIdx),
    listing: { listingIdx: toId(room.listingIdx), listingType: room.listingType, title: room.listingTitle, thumbnailUrl: room.listingThumbnailUrl, displayPrice: displayPrice === null ? null : Number(displayPrice), status: room.listingType === "USED" ? room.usedTradeStatus : room.auctionStatus, deleted: Boolean(room.listingDeletedAt), detailLinkEnabled: !room.listingDeletedAt },
    seller: person(room.sellerUserIdx, room.sellerNickname, room.sellerProfileImageUrl, sellerActive),
    buyer: person(room.buyerUserIdx, room.buyerNickname, room.buyerProfileImageUrl, buyerActive),
    unreadCount, canSendMessage: writeState.canSendMessage, canCreatePaymentRequest, readOnly: !writeState.canSendMessage, readOnlyReason: writeState.readOnlyReason,
  };
}

export function toChatMessageDto(row) {
  return {
    messageIdx: toId(row.messageIdx), chatRoomIdx: toId(row.chatRoomIdx), senderIdx: row.senderIdx === null ? null : toId(row.senderIdx),
    messageType: row.messageType, content: row.content, clientMessageId: row.clientMessageId,
    imageUrl: row.imageUrl, transactionIdx: row.transactionIdx === null ? null : toId(row.transactionIdx), createdAt: row.createdAt,
  };
}
