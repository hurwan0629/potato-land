import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import { query, withTransaction } from "../../infrastructure/database/database.js";
import {
  emitChatMessageNew,
  emitChatRoomNew,
  emitChatRoomUpdated,
} from "../../sockets/emitters/chat.emitter.js";
import { getChatUnreadCount, parsePositiveInteger } from "../chats/chats.service.js";
import {
  createNotification,
  emitNotificationAfterCommit,
} from "../notifications/notifications.service.js";

const log = logger.child("transactions-controller");

function validationError(field) {
  return new AppError({
    status: 400,
    code: "VALIDATION_ERROR",
    message: "입력값을 확인해주세요.",
    details: { field },
  });
}

function personDto(row, prefix) {
  return {
    userIdx: Number(row[`${prefix}Idx`]),
    nickname: row[`${prefix}Nickname`],
    profileImageUrl: row[`${prefix}ProfileImageUrl`],
    averageRating: Number(row[`${prefix}AverageRating`] ?? 0),
  };
}

async function emitRoomUpdated(room, message) {
  const [sellerUnreadCount, buyerUnreadCount] = await Promise.all([
    getChatUnreadCount(query, room.sellerIdx, room.chatRoomIdx),
    getChatUnreadCount(query, room.buyerIdx, room.chatRoomIdx),
  ]);
  const payload = {
    chatRoomIdx: Number(room.chatRoomIdx),
    listingIdx: Number(room.listingIdx),
    lastMessage: message ? {
      messageIdx: Number(message.messageIdx),
      messageType: message.messageType,
      content: message.content,
      senderIdx: message.senderIdx === null ? null : Number(message.senderIdx),
      createdAt: message.createdAt,
    } : null,
    updatedAt: message?.createdAt ?? new Date().toISOString(),
  };
  emitChatRoomUpdated(room.sellerIdx, { ...payload, unreadCount: sellerUnreadCount });
  emitChatRoomUpdated(room.buyerIdx, { ...payload, unreadCount: buyerUnreadCount });
}

async function emitAfterPaymentCommit({ room, message, notification, notificationReceiverIdx, roomCreated }) {
  try {
    if (roomCreated) {
      emitChatRoomNew(room.sellerIdx, {
        chatRoomIdx: Number(room.chatRoomIdx),
        listingIdx: Number(room.listingIdx),
        listingTitle: room.listingTitle,
        listingThumbnailUrl: room.listingThumbnailUrl,
        opponentIdx: Number(room.buyerIdx),
        opponentNickname: room.buyerNickname,
        lastMessage: null,
        unreadCount: 0,
        createdAt: room.createdAt,
      });
      emitChatRoomNew(room.buyerIdx, {
        chatRoomIdx: Number(room.chatRoomIdx),
        listingIdx: Number(room.listingIdx),
        listingTitle: room.listingTitle,
        listingThumbnailUrl: room.listingThumbnailUrl,
        opponentIdx: Number(room.sellerIdx),
        opponentNickname: room.sellerNickname,
        lastMessage: null,
        unreadCount: 0,
        createdAt: room.createdAt,
      });
    }
    if (message) emitChatMessageNew(room.chatRoomIdx, message);
    await emitRoomUpdated(room, message);
    if (notification) await emitNotificationAfterCommit(notificationReceiverIdx, notification);
  } catch (error) {
    log.warn("저장된 거래 결과의 Socket 전송에 실패했습니다.", { error });
  }
}

async function findRoom(client, listingIdx, buyerIdx) {
  const { rows } = await client.query(
    `
      SELECT
        cr.idx AS "chatRoomIdx", cr.listing_idx AS "listingIdx", cr.buyer_idx AS "buyerIdx",
        cr.created_at AS "createdAt", l.seller_idx AS "sellerIdx", l.title AS "listingTitle",
        seller.nickname AS "sellerNickname", buyer.nickname AS "buyerNickname",
        thumbnail.image_url AS "listingThumbnailUrl"
      FROM chat_rooms cr
      JOIN listings l ON l.idx = cr.listing_idx
      JOIN users seller ON seller.idx = l.seller_idx
      JOIN users buyer ON buyer.idx = cr.buyer_idx
      LEFT JOIN LATERAL (
        SELECT image_url FROM post_images WHERE listing_idx = l.idx ORDER BY sort_order ASC LIMIT 1
      ) thumbnail ON TRUE
      WHERE cr.listing_idx = $1 AND cr.buyer_idx = $2
    `,
    [listingIdx, buyerIdx],
  );
  return rows[0] ?? null;
}

function messagePayload(row, paymentRequest = null) {
  return {
    messageIdx: Number(row.messageIdx),
    chatRoomIdx: Number(row.chatRoomIdx),
    senderIdx: row.senderIdx === null ? null : Number(row.senderIdx),
    senderNickname: row.senderNickname ?? null,
    senderProfileImageUrl: row.senderProfileImageUrl ?? null,
    messageType: row.messageType,
    content: row.content,
    imageUrl: null,
    transactionIdx: Number(row.transactionIdx),
    ...(paymentRequest ? { paymentRequest } : {}),
    createdAt: row.createdAt,
  };
}

export async function createPaymentRequest(req, res) {
  const listingIdx = parsePositiveInteger(req.body?.listingIdx, "listingIdx");
  const buyerIdx = parsePositiveInteger(req.body?.buyerIdx, "buyerIdx");
  const amount = Number(req.body?.amount);
  const requestedMessage = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!Number.isSafeInteger(amount) || amount < 0 || requestedMessage.length > 500) {
    throw validationError(!Number.isSafeInteger(amount) || amount < 0 ? "amount" : "message");
  }

  let result;
  try {
    result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `
          SELECT
            l.idx AS "listingIdx", l.seller_idx AS "sellerIdx", l.listing_type AS "listingType",
            l.title AS "listingTitle", l.deleted_at AS "listingDeletedAt",
            seller.nickname AS "sellerNickname", seller.profile_image AS "sellerProfileImageUrl",
            seller.deleted_at AS "sellerDeletedAt", seller.banned_at AS "sellerBannedAt",
            buyer.idx AS "buyerIdx", buyer.nickname AS "buyerNickname", buyer.profile_image AS "buyerProfileImageUrl",
            buyer.deleted_at AS "buyerDeletedAt", buyer.banned_at AS "buyerBannedAt",
            used_post.trade_status AS "usedTradeStatus", auction_post.status AS "auctionStatus",
            auction_post.current_price AS "auctionCurrentPrice", winning_bid.bidder_idx AS "winningBidderIdx"
          FROM listings l
          JOIN users seller ON seller.idx = l.seller_idx
          JOIN users buyer ON buyer.idx = $2
          LEFT JOIN used_posts used_post ON used_post.listing_idx = l.idx
          LEFT JOIN auction_posts auction_post ON auction_post.listing_idx = l.idx
          LEFT JOIN auction_bids winning_bid ON winning_bid.idx = auction_post.winning_bid_idx
          WHERE l.idx = $1
          FOR UPDATE OF l
        `,
        [listingIdx, buyerIdx],
      );
      const listing = rows[0];
      if (!listing || listing.listingDeletedAt) throw new AppError({ status: 404, code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." });
      if (Number(listing.sellerIdx) !== Number(req.user.userIdx)) throw new AppError({ status: 403, code: "FORBIDDEN", message: "판매자만 송금 요청을 만들 수 있습니다." });
      if (Number(listing.sellerIdx) === buyerIdx) throw new AppError({ status: 403, code: "FORBIDDEN", message: "판매자와 구매자는 달라야 합니다." });
      if (listing.buyerDeletedAt || listing.buyerBannedAt || listing.sellerDeletedAt || listing.sellerBannedAt) {
        throw new AppError({ status: 409, code: "INACTIVE_USER", message: "비활성화된 사용자에게 송금 요청을 만들 수 없습니다." });
      }

      let room = await findRoom(client, listingIdx, buyerIdx);
      let roomCreated = false;
      if (listing.listingType === "USED") {
        if (listing.usedTradeStatus !== "ON_SALE") throw new AppError({ status: 409, code: "CONFLICT", message: "거래가 종료된 게시글입니다." });
        if (!room) throw new AppError({ status: 403, code: "FORBIDDEN", message: "구매 희망자와의 채팅방에서만 송금 요청을 만들 수 있습니다." });
      } else {
        if (listing.auctionStatus !== "FINISHED" || Number(listing.winningBidderIdx) !== buyerIdx) {
          throw new AppError({ status: 403, code: "FORBIDDEN", message: "낙찰자에게만 송금 요청을 만들 수 있습니다." });
        }
        if (Number(listing.auctionCurrentPrice) !== amount) {
          throw validationError("amount");
        }
        if (!room) {
          const insertedRoom = await client.query(
            `
              INSERT INTO chat_rooms (listing_idx, buyer_idx)
              VALUES ($1, $2)
              ON CONFLICT (listing_idx, buyer_idx) DO NOTHING
            `,
            [listingIdx, buyerIdx],
          );
          room = await findRoom(client, listingIdx, buyerIdx);
          roomCreated = insertedRoom.rowCount === 1;
        }
      }

      const existing = await client.query(
        `
          SELECT idx FROM transactions
          WHERE listing_idx = $1 AND status IN ('REQUESTED', 'COMPLETED')
        `,
        [listingIdx],
      );
      if (existing.rowCount > 0) throw new AppError({ status: 409, code: "CONFLICT", message: "같은 구매자에게 이미 진행 중인 송금 요청이 있습니다." });

      const transaction = await client.query(
        `
          INSERT INTO transactions (listing_idx, seller_idx, buyer_idx, transaction_type, amount)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING idx AS "transactionIdx", created_at AS "createdAt"
        `,
        [listingIdx, listing.sellerIdx, buyerIdx, listing.listingType === "AUCTION" ? "AUCTION" : "DIRECT_SALE", amount],
      );
      const transactionRow = transaction.rows[0];
      const content = requestedMessage || "송금 요청이 도착했습니다.";
      const message = await client.query(
        `
          INSERT INTO chat_messages (chat_room_idx, sender_idx, message_type, transaction_idx, content)
          VALUES ($1, $2, 'PAYMENT_REQUEST', $3, $4)
          RETURNING idx AS "messageIdx", chat_room_idx AS "chatRoomIdx", sender_idx AS "senderIdx",
            message_type AS "messageType", transaction_idx AS "transactionIdx", content, created_at AS "createdAt"
        `,
        [room.chatRoomIdx, listing.sellerIdx, transactionRow.transactionIdx, content],
      );
      const messageRow = message.rows[0];
      await client.query(
        `UPDATE chat_rooms SET updated_at = NOW(), last_message_at = $2 WHERE idx = $1`,
        [room.chatRoomIdx, messageRow.createdAt],
      );
      const notification = await createNotification(client, {
        receiverIdx: buyerIdx,
        notificationType: "PAYMENT_REQUESTED",
        referenceType: "TRANSACTION",
        referenceIdx: transactionRow.transactionIdx,
        content: "송금 요청이 도착했습니다.",
      });
      return {
        room,
        roomCreated,
        notification,
        message: messagePayload({ ...messageRow, senderNickname: listing.sellerNickname, senderProfileImageUrl: listing.sellerProfileImageUrl }, {
          transactionIdx: Number(transactionRow.transactionIdx), amount, status: "REQUESTED",
        }),
        data: {
          transactionIdx: Number(transactionRow.transactionIdx), listingIdx, sellerIdx: Number(listing.sellerIdx), buyerIdx,
          amount, status: "REQUESTED", chatMessageIdx: Number(messageRow.messageIdx), createdAt: transactionRow.createdAt,
        },
      };
    });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError({ status: 409, code: "CONFLICT", message: "같은 구매자에게 이미 진행 중인 송금 요청이 있습니다." });
    }
    throw error;
  }
  void emitAfterPaymentCommit({ ...result, notificationReceiverIdx: result.data.buyerIdx });
  res.status(201).json({ success: true, data: result.data });
}

export async function getTransaction(req, res) {
  const transactionIdx = parsePositiveInteger(req.params.transactionIdx, "transactionIdx");
  const { rows } = await query(
    `
      SELECT
        t.idx AS "transactionIdx", t.amount, t.status, t.created_at AS "requestedAt", t.completed_at AS "completedAt",
        t.canceled_by AS "canceledBy", t.updated_at AS "updatedAt", l.idx AS "listingIdx", l.listing_type AS "listingType",
        l.title AS "listingTitle", seller.idx AS "sellerIdx", seller.nickname AS "sellerNickname",
        seller.profile_image AS "sellerProfileImageUrl", buyer.idx AS "buyerIdx", buyer.nickname AS "buyerNickname",
        buyer.profile_image AS "buyerProfileImageUrl", thumbnail.image_url AS "listingThumbnailUrl"
      FROM transactions t
      JOIN listings l ON l.idx = t.listing_idx
      JOIN users seller ON seller.idx = t.seller_idx
      JOIN users buyer ON buyer.idx = t.buyer_idx
      LEFT JOIN LATERAL (
        SELECT image_url FROM post_images WHERE listing_idx = l.idx ORDER BY sort_order ASC LIMIT 1
      ) thumbnail ON TRUE
      WHERE t.idx = $1
    `,
    [transactionIdx],
  );
  const transaction = rows[0];
  if (!transaction) throw new AppError({ status: 404, code: "NOT_FOUND", message: "거래 정보를 찾을 수 없습니다." });
  if (Number(transaction.sellerIdx) !== Number(req.user.userIdx) && Number(transaction.buyerIdx) !== Number(req.user.userIdx)) {
    throw new AppError({ status: 403, code: "FORBIDDEN", message: "거래 참여자만 조회할 수 있습니다." });
  }
  res.status(200).json({
    success: true,
    data: {
      transactionIdx: Number(transaction.transactionIdx),
      listing: { listingIdx: Number(transaction.listingIdx), listingType: transaction.listingType, title: transaction.listingTitle, thumbnailUrl: transaction.listingThumbnailUrl, displayPrice: Number(transaction.amount) },
      seller: personDto(transaction, "seller"),
      buyer: personDto(transaction, "buyer"),
      amount: Number(transaction.amount), status: transaction.status, requestedAt: transaction.requestedAt,
      completedAt: transaction.completedAt, canceledBy: transaction.canceledBy === null ? null : Number(transaction.canceledBy), updatedAt: transaction.updatedAt,
    },
  });
}

async function getLockedTransaction(client, transactionIdx) {
  const { rows } = await client.query(
    `
      SELECT
        t.idx AS "transactionIdx", t.listing_idx AS "listingIdx", t.seller_idx AS "sellerIdx", t.buyer_idx AS "buyerIdx",
        t.amount, t.status, l.listing_type AS "listingType", l.title AS "listingTitle",
        seller.nickname AS "sellerNickname", seller.profile_image AS "sellerProfileImageUrl",
        seller.deleted_at AS "sellerDeletedAt", seller.banned_at AS "sellerBannedAt",
        buyer.deleted_at AS "buyerDeletedAt", buyer.banned_at AS "buyerBannedAt"
      FROM transactions t
      JOIN listings l ON l.idx = t.listing_idx
      JOIN users seller ON seller.idx = t.seller_idx
      JOIN users buyer ON buyer.idx = t.buyer_idx
      WHERE t.idx = $1
      FOR UPDATE OF t
    `,
    [transactionIdx],
  );
  if (!rows[0]) throw new AppError({ status: 404, code: "NOT_FOUND", message: "거래 정보를 찾을 수 없습니다." });
  return rows[0];
}

export async function completeTransaction(req, res) {

  // 거래 번호 양수인지 검수
  const transactionIdx = parsePositiveInteger(req.params.transactionIdx, "transactionIdx");

  // 구매자가 송금을 선택했는지 확인
  if (req.body?.confirm !== true) throw validationError("confirm");

  // 데이터베이스 변경
  const result = await withTransaction(async (client) => {
    const transaction = await getLockedTransaction(client, transactionIdx);
    if (Number(transaction.buyerIdx) !== Number(req.user.userIdx)) throw new AppError({ status: 403, code: "FORBIDDEN", message: "구매자만 송금을 완료할 수 있습니다." });
    if (transaction.status !== "REQUESTED") throw new AppError({ status: 409, code: "CONFLICT", message: "이미 완료되었거나 취소된 송금 요청입니다." });
    if (transaction.sellerDeletedAt || transaction.sellerBannedAt || transaction.buyerDeletedAt || transaction.buyerBannedAt) throw new AppError({ status: 409, code: "INACTIVE_USER", message: "비활성화된 사용자가 포함된 거래입니다." });
    const completed = await client.query(
      `
        UPDATE transactions SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
        WHERE idx = $1
        RETURNING completed_at AS "completedAt"
      `,
      [transactionIdx],
    );
    if (transaction.listingType === "USED") {
      await client.query(`UPDATE used_posts SET trade_status = 'SOLD' WHERE listing_idx = $1`, [transaction.listingIdx]);
    }
    const room = await findRoom(client, transaction.listingIdx, transaction.buyerIdx);
    const message = await client.query(
      `
        INSERT INTO chat_messages (chat_room_idx, sender_idx, message_type, transaction_idx, content)
        VALUES ($1, NULL, 'TRADE_COMPLETE', $2, '거래가 완료되었습니다.')
        RETURNING idx AS "messageIdx", chat_room_idx AS "chatRoomIdx", sender_idx AS "senderIdx",
          message_type AS "messageType", transaction_idx AS "transactionIdx", content, created_at AS "createdAt"
      `,
      [room.chatRoomIdx, transactionIdx],
    );
    const messageRow = message.rows[0];
    await client.query(`UPDATE chat_rooms SET updated_at = NOW(), last_message_at = $2 WHERE idx = $1`, [room.chatRoomIdx, messageRow.createdAt]);
    const notification = await createNotification(client, {
      receiverIdx: transaction.sellerIdx, 
      notificationType: "PAYMENT_RECEIVED", 
      referenceType: "TRANSACTION", referenceIdx: transactionIdx, 
      content: "입금이 완료되었습니다.",
    });
    return {
      room,
      notification,
      message: messagePayload(messageRow),
      data: { transactionIdx, status: "COMPLETED", completedAt: completed.rows[0].completedAt, listingStatus: transaction.listingType === "USED" ? "SOLD" : "FINISHED", systemMessageType: "TRADE_COMPLETE", sellerNotificationType: "PAYMENT_RECEIVED" },
    };
  });
  void emitAfterPaymentCommit({ ...result, roomCreated: false, notificationReceiverIdx: result.room.sellerIdx });
  res.status(200).json({ success: true, data: result.data });
}

export async function cancelTransaction(req, res) {
  const transactionIdx = parsePositiveInteger(req.params.transactionIdx, "transactionIdx");
  const result = await withTransaction(async (client) => {
    const transaction = await getLockedTransaction(client, transactionIdx);
    if (Number(transaction.sellerIdx) !== Number(req.user.userIdx)) throw new AppError({ status: 403, code: "FORBIDDEN", message: "판매자만 송금 요청을 취소할 수 있습니다." });
    if (transaction.status !== "REQUESTED") throw new AppError({ status: 409, code: "CONFLICT", message: "이미 완료되었거나 취소된 송금 요청입니다." });
    const canceled = await client.query(
      `
        UPDATE transactions SET status = 'CANCELED', canceled_by = $2, updated_at = NOW()
        WHERE idx = $1
        RETURNING updated_at AS "updatedAt"
      `,
      [transactionIdx, req.user.userIdx],
    );
    const buyerActive = !transaction.buyerDeletedAt && !transaction.buyerBannedAt;
    const notification = buyerActive ? await createNotification(client, {
      receiverIdx: transaction.buyerIdx, notificationType: "PAYMENT_CANCELED", referenceType: "TRANSACTION", referenceIdx: transactionIdx, content: "송금 요청이 취소되었습니다.",
    }) : null;
    return {
      room: await findRoom(client, transaction.listingIdx, transaction.buyerIdx),
      notification,
      data: { transactionIdx, status: "CANCELED", canceledBy: Number(req.user.userIdx), updatedAt: canceled.rows[0].updatedAt, buyerNotificationType: buyerActive ? "PAYMENT_CANCELED" : null },
    };
  });
  void emitAfterPaymentCommit({ ...result, message: null, roomCreated: false, notificationReceiverIdx: result.room.buyerIdx });
  res.status(200).json({ success: true, data: result.data });
}
