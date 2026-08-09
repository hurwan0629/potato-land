import { randomUUID } from "node:crypto";

import { logger } from "../common/logging/logger.js";
import { query } from "../infrastructure/database/database.js";
import {
  createAuctionBid,
} from "../modules/auctions/auctions.service.js";
import {
  createTextMessage,
  getChatUnreadCount,
} from "../modules/chats/chats.service.js";
import {
  emitNotificationAfterCommit,
} from "../modules/notifications/notifications.service.js";
import { createReview } from "../modules/reviews/reviews.service.js";
import {
  emitChatMessageNew,
  emitChatRoomUpdated,
} from "../sockets/emitters/chat.emitter.js";
import { createDemoBotScheduler } from "./demoBotScheduler.js";

const log = logger.child("demo-bot");

const CHAT_MESSAGES = [
  "안녕하세요. 아직 거래 가능할까요?",
  "상품 상태를 조금 더 확인하고 싶어요.",
  "오늘 저녁 시간에 거래할 수 있습니다.",
  "좋습니다. 채팅으로 장소를 맞춰볼게요.",
  "확인했습니다. 감사합니다!",
];

const REVIEW_MESSAGES = [
  "응답이 빠르고 거래가 친절했어요.",
  "상품 설명과 실제 상태가 같았습니다.",
  "시간 약속을 잘 지켜주셨어요.",
  "거래 과정이 편하고 깔끔했습니다.",
];

function toNumber(value) {
  return Number(value);
}

/** 진행 중인 데모 경매와 입찰 가능한 활성 데모 사용자를 찾는다. */
async function findAuctionBidTarget(cursor) {
  const auctionResult = await query(
    `
      SELECT
        auction.listing_idx AS "listingIdx",
        auction.current_price AS "currentPrice",
        auction.bid_unit AS "bidUnit",
        listing.seller_idx AS "sellerIdx"
      FROM auction_posts auction
      JOIN listings listing ON listing.idx = auction.listing_idx
      JOIN users seller ON seller.idx = listing.seller_idx
      WHERE seller.login_id LIKE 'demo\\_%' ESCAPE '\\'
        AND listing.deleted_at IS NULL
        AND auction.status = 'ON_GOING'
        AND auction.ends_at > NOW() + INTERVAL '1 minute'
      ORDER BY auction.ends_at ASC, auction.listing_idx ASC
      LIMIT 1
    `,
  );

  const auction = auctionResult.rows[0];
  if (!auction) {
    return null;
  }

  const bidderResult = await query(
    `
      SELECT idx AS "userIdx", login_id AS "loginId"
      FROM users
      WHERE login_id IN (
        'demo_bidder_a',
        'demo_bidder_b',
        'demo_buyer',
        'demo_spectator'
      )
        AND deleted_at IS NULL
        AND banned_at IS NULL
        AND idx <> $1
      ORDER BY idx ASC
    `,
    [auction.sellerIdx],
  );

  if (bidderResult.rows.length === 0) {
    return null;
  }

  const bidder = bidderResult.rows[cursor % bidderResult.rows.length];
  return {
    listingIdx: toNumber(auction.listingIdx),
    bidderIdx: toNumber(bidder.userIdx),
    bidderLoginId: bidder.loginId,
    bidAmount: toNumber(auction.currentPrice) + toNumber(auction.bidUnit),
  };
}

/** 채팅을 계속 쓸 수 있는 데모 채팅방을 찾는다. */
async function findWritableChatTarget(cursor) {
  const { rows } = await query(
    `
      SELECT
        room.idx AS "chatRoomIdx",
        room.buyer_idx AS "buyerIdx",
        listing.idx AS "listingIdx",
        listing.seller_idx AS "sellerIdx"
      FROM chat_rooms room
      JOIN listings listing ON listing.idx = room.listing_idx
      JOIN users seller ON seller.idx = listing.seller_idx
      JOIN users buyer ON buyer.idx = room.buyer_idx
      LEFT JOIN used_posts used_post ON used_post.listing_idx = listing.idx
      LEFT JOIN auction_posts auction ON auction.listing_idx = listing.idx
      LEFT JOIN transactions tx
        ON tx.listing_idx = listing.idx
       AND tx.seller_idx = listing.seller_idx
       AND tx.buyer_idx = room.buyer_idx
       AND tx.status = 'REQUESTED'
      WHERE (seller.login_id LIKE 'demo\\_%' ESCAPE '\\'
          OR buyer.login_id LIKE 'demo\\_%' ESCAPE '\\')
        AND listing.deleted_at IS NULL
        AND seller.deleted_at IS NULL
        AND seller.banned_at IS NULL
        AND buyer.deleted_at IS NULL
        AND buyer.banned_at IS NULL
        AND (
          (listing.listing_type = 'USED' AND used_post.trade_status = 'ON_SALE')
          OR
          (listing.listing_type = 'AUCTION'
            AND auction.status = 'FINISHED'
            AND tx.idx IS NOT NULL)
        )
      ORDER BY room.updated_at ASC, room.idx ASC
    `,
  );

  if (rows.length === 0) {
    return null;
  }

  const room = rows[cursor % rows.length];
  const senderIdx = cursor % 2 === 0
    ? toNumber(room.buyerIdx)
    : toNumber(room.sellerIdx);

  return {
    chatRoomIdx: toNumber(room.chatRoomIdx),
    listingIdx: toNumber(room.listingIdx),
    sellerIdx: toNumber(room.sellerIdx),
    buyerIdx: toNumber(room.buyerIdx),
    senderIdx,
  };
}

/** 완료된 데모 거래 중 아직 한쪽 후기가 없는 대상을 찾는다. */
async function findReviewTarget() {
  const { rows } = await query(
    `
      SELECT
        transaction.idx AS "transactionIdx",
        CASE
          WHEN seller_review.idx IS NULL THEN transaction.seller_idx
          ELSE transaction.buyer_idx
        END AS "reviewerIdx",
        CASE
          WHEN seller_review.idx IS NULL THEN transaction.buyer_idx
          ELSE transaction.seller_idx
        END AS "revieweeIdx"
      FROM transactions transaction
      JOIN listings listing ON listing.idx = transaction.listing_idx
      JOIN users seller ON seller.idx = transaction.seller_idx
      JOIN users buyer ON buyer.idx = transaction.buyer_idx
      LEFT JOIN reviews seller_review
        ON seller_review.transaction_idx = transaction.idx
       AND seller_review.reviewer_idx = transaction.seller_idx
      LEFT JOIN reviews buyer_review
        ON buyer_review.transaction_idx = transaction.idx
       AND buyer_review.reviewer_idx = transaction.buyer_idx
      WHERE transaction.status = 'COMPLETED'
        AND (seller.login_id LIKE 'demo\\_%' ESCAPE '\\'
          OR buyer.login_id LIKE 'demo\\_%' ESCAPE '\\')
        AND (seller_review.idx IS NULL OR buyer_review.idx IS NULL)
      ORDER BY transaction.completed_at DESC NULLS LAST, transaction.idx ASC
      LIMIT 1
    `,
  );

  if (!rows[0]) {
    return null;
  }

  return {
    transactionIdx: toNumber(rows[0].transactionIdx),
    reviewerIdx: toNumber(rows[0].reviewerIdx),
    revieweeIdx: toNumber(rows[0].revieweeIdx),
  };
}

async function emitChatSideEffects(result) {
  emitChatMessageNew(result.message.chatRoomIdx, result.message);

  const room = result.room;
  const [sellerUnreadCount, buyerUnreadCount] = await Promise.all([
    getChatUnreadCount(query, room.sellerIdx, result.message.chatRoomIdx),
    getChatUnreadCount(query, room.buyerIdx, result.message.chatRoomIdx),
  ]);
  const basePayload = {
    chatRoomIdx: result.message.chatRoomIdx,
    listingIdx: toNumber(room.listingIdx),
    lastMessage: {
      messageIdx: result.message.messageIdx,
      messageType: result.message.messageType,
      content: result.message.content,
      senderIdx: result.message.senderIdx,
      createdAt: result.message.createdAt,
    },
    updatedAt: result.message.createdAt,
  };

  emitChatRoomUpdated(room.sellerIdx, {
    ...basePayload,
    unreadCount: sellerUnreadCount,
  });
  emitChatRoomUpdated(room.buyerIdx, {
    ...basePayload,
    unreadCount: buyerUnreadCount,
  });

  if (result.notification) {
    await emitNotificationAfterCommit(result.receiverIdx, result.notification);
  }
}

/**
 * 서버에서 사용하는 실제 데모 봇을 만든다.
 * development + DEMO_BOT_ENABLED=true 조합에서만 타이머가 시작된다.
 */
export function createDemoBot({
  io,
  nodeEnv,
  enabled,
  intervalMs,
  schedulerOptions = {},
}) {
  let bidCursor = 0;
  let chatCursor = 0;
  let reviewCursor = 0;

  const actionHandlers = {
    async auctionBid() {
      const target = await findAuctionBidTarget(bidCursor);
      bidCursor += 1;

      if (!target) {
        return { skipped: true, reason: "NO_AUCTION_TARGET" };
      }

      const bid = await createAuctionBid(
        target.bidderIdx,
        target.listingIdx,
        { bidAmount: target.bidAmount },
      );

      return {
        listingIdx: target.listingIdx,
        bidderIdx: target.bidderIdx,
        bidderLoginId: target.bidderLoginId,
        bidAmount: bid.bidAmount,
      };
    },

    async chatMessage() {
      const target = await findWritableChatTarget(chatCursor);
      const content = CHAT_MESSAGES[chatCursor % CHAT_MESSAGES.length];
      chatCursor += 1;

      if (!target) {
        return { skipped: true, reason: "NO_CHAT_TARGET" };
      }

      const result = await createTextMessage({
        io,
        userIdx: target.senderIdx,
        payload: {
          chatRoomIdx: target.chatRoomIdx,
          clientMessageId: `demo-bot-${randomUUID()}`,
          messageType: "TEXT",
          content,
        },
      });

      if (result.created) {
        await emitChatSideEffects(result);
      }

      return {
        chatRoomIdx: target.chatRoomIdx,
        senderIdx: target.senderIdx,
        messageIdx: result.message.messageIdx,
      };
    },

    async review() {
      const target = await findReviewTarget();
      const content = REVIEW_MESSAGES[reviewCursor % REVIEW_MESSAGES.length];
      const rating = 8 + (reviewCursor % 3);
      reviewCursor += 1;

      if (!target) {
        return { skipped: true, reason: "NO_REVIEW_TARGET" };
      }

      const review = await createReview(target.reviewerIdx, {
        transactionIdx: target.transactionIdx,
        revieweeIdx: target.revieweeIdx,
        rating,
        content,
      });

      return {
        reviewIdx: review.reviewIdx,
        transactionIdx: target.transactionIdx,
        reviewerIdx: target.reviewerIdx,
        revieweeIdx: target.revieweeIdx,
        rating,
      };
    },
  };

  return createDemoBotScheduler({
    nodeEnv,
    enabled,
    intervalMs,
    actionHandlers,
    onResult(result) {
      log.info("데모 봇 작업을 실행했습니다.", result);
    },
    onError(error, actionName) {
      log.warn("데모 봇 작업에 실패했습니다.", { actionName, error });
    },
    ...schedulerOptions,
  });
}
