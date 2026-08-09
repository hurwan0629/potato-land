import assert from "node:assert/strict";
import test from "node:test";

import { getChatWriteState } from "../src/modules/chats/chats.service.js";

const activeUsers = {
  sellerDeletedAt: null,
  sellerBannedAt: null,
  buyerDeletedAt: null,
  buyerBannedAt: null,
  listingDeletedAt: null,
};

test("판매 중인 중고거래 채팅은 메시지를 보낼 수 있다", () => {
  const state = getChatWriteState({
    ...activeUsers,
    listingType: "USED",
    usedTradeStatus: "ON_SALE",
  });

  assert.equal(state.canSendMessage, true);
});

test("진행 중 경매의 일반 채팅은 쓸 수 없다", () => {
  const state = getChatWriteState({
    ...activeUsers,
    listingType: "AUCTION",
    auctionStatus: "ON_GOING",
    transactionStatus: null,
  });

  assert.equal(state.canSendMessage, false);
  assert.equal(state.readOnlyReason, "AUCTION_CLOSED");
});

test("종료된 경매의 낙찰 거래 채팅은 메시지를 보낼 수 있다", () => {
  const state = getChatWriteState({
    ...activeUsers,
    listingType: "AUCTION",
    auctionStatus: "FINISHED",
    transactionStatus: "REQUESTED",
  });

  assert.equal(state.canSendMessage, true);
});
