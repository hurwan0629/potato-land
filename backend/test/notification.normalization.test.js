import assert from "node:assert/strict";
import test from "node:test";

import { normalizeNotification } from "../src/modules/notifications/notifications.service.js";

test("snake_case 낙찰 알림을 거래 화면 DTO로 정규화한다", () => {
  const notification = normalizeNotification({
    idx: "10",
    receiver_idx: "2",
    notification_type: "AUCTION_WON",
    reference_type: "TRANSACTION",
    reference_idx: "30",
    content: "낙찰",
    is_read: false,
    created_at: "2026-08-06T00:00:00.000Z",
  });

  assert.equal(notification.notificationIdx, 10);
  assert.equal(notification.receiverIdx, 2);
  assert.equal(notification.referenceIdx, 30);
  assert.equal(notification.targetPath, "/payment/30");
});

test("삭제 알림은 존재하지 않는 상세 화면으로 이동하지 않는다", () => {
  const notification = normalizeNotification({
    notificationIdx: 1,
    receiverIdx: 2,
    notificationType: "LISTING_DELETED",
    referenceType: "AUCTION",
    referenceIdx: 3,
  });

  assert.equal(notification.targetPath, null);
});

test("후기 알림은 수신자의 프로필로 이동한다", () => {
  const notification = normalizeNotification({
    notificationIdx: 1,
    receiverIdx: 7,
    notificationType: "NEW_REVIEW",
    referenceType: "REVIEW",
    referenceIdx: 9,
  });

  assert.equal(notification.targetPath, "/mypage/7");
});

test("실시간 채팅 알림의 명시적 targetPath를 보존한다", () => {
  const notification = normalizeNotification({
    notificationIdx: 1,
    receiverIdx: 7,
    notificationType: "NEW_MESSAGE",
    referenceType: "CHAT_MESSAGE",
    referenceIdx: 9,
    targetPath: "/chat/4",
  });

  assert.equal(notification.targetPath, "/chat/4");
});
