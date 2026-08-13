import { logger } from "../common/logging/logger.js";
import { SOCKET_EVENT } from "../common/constants/socketEvent.js";
import { SOCKET_ROOM } from "../common/constants/socketRoom.js";
import {
  createTextMessage,
  getChatRoomForParticipant,
  markChatNotificationsRead,
  parsePositiveInteger,
} from "../modules/chats/chats.service.js";
import {
  emitChatMessageNew,
  emitChatRoomUpdated,
} from "./emitters/chat.emitter.js";
import {
  emitNotificationAfterCommit,
  emitUnreadCountAfterCommit,
} from "../modules/notifications/notifications.service.js";
import { query, withTransaction } from "../infrastructure/database/database.js";

const log = logger.child("chat-socket");

function socketError(socket, event, error, ack) {
  const payload = {
    success: false,
    code: error.code ?? "SOCKET_ERROR",
    message: error.expose === false ? "요청을 처리할 수 없습니다." : error.message ?? "요청을 처리할 수 없습니다.",
  };
  if (typeof ack === "function") {
    ack(payload);
    return;
  }
  socket.emit(SOCKET_EVENT.ERROR, {
    code: payload.code,
    message: payload.message,
    event,
    details: error.details ?? {},
  });
}

async function emitRoomUpdatedAfterCommit(room, message) {
  const lastMessage = {
    messageIdx: message.messageIdx,
    messageType: message.messageType,
    content: message.content,
    senderIdx: message.senderIdx,
    createdAt: message.createdAt,
  };
  const unreadByUser = async (userIdx) => {
    const { rows } = await query(
      `
        SELECT COUNT(*)::integer AS "unreadCount"
        FROM notifications notification
        JOIN chat_messages unread_message ON unread_message.idx = notification.reference_idx
        WHERE notification.receiver_idx = $1
          AND notification.notification_type = 'NEW_MESSAGE'
          AND notification.reference_type = 'CHAT_MESSAGE'
          AND notification.is_read = FALSE
          AND unread_message.chat_room_idx = $2
      `,
      [userIdx, message.chatRoomIdx],
    );
    return rows[0].unreadCount;
  };
  const [sellerUnreadCount, buyerUnreadCount] = await Promise.all([
    unreadByUser(room.sellerIdx),
    unreadByUser(room.buyerIdx),
  ]);

  // 판매자에게 채팅 데이터 발송
  emitChatRoomUpdated(room.sellerIdx, {
    chatRoomIdx: message.chatRoomIdx,
    listingIdx: Number(room.listingIdx),
    lastMessage,
    unreadCount: sellerUnreadCount,
    updatedAt: message.createdAt,
  });

  // 구매자에게 채팅 데이터 발송
  emitChatRoomUpdated(room.buyerIdx, {
    chatRoomIdx: message.chatRoomIdx,
    listingIdx: Number(room.listingIdx),
    lastMessage,
    unreadCount: buyerUnreadCount,
    updatedAt: message.createdAt,
  });
}

export function registerChatSocket(io, socket) {
  // room에 들어가서 이벤트 받을 준비 해주기
  socket.on(SOCKET_EVENT.CHAT_JOIN, (payload, ack) => {
    void (async () => {
      try {
        const chatRoomIdx = parsePositiveInteger(payload?.chatRoomIdx, "chatRoomIdx");
        await getChatRoomForParticipant(chatRoomIdx, socket.data.user.userIdx);
        if (socket.data.activeAuctionListingIdx !== null) {
          await socket.leave(SOCKET_ROOM.auction(socket.data.activeAuctionListingIdx));
          socket.data.activeAuctionListingIdx = null;
        }
        if (socket.data.activeChatRoomIdx !== null && Number(socket.data.activeChatRoomIdx) !== chatRoomIdx) {
          await socket.leave(SOCKET_ROOM.chat(socket.data.activeChatRoomIdx));
        }
        await socket.join(SOCKET_ROOM.chat(chatRoomIdx));
        socket.data.activeChatRoomIdx = chatRoomIdx;
        const unreadCount = await withTransaction((client) =>
          markChatNotificationsRead(client, socket.data.user.userIdx, chatRoomIdx),
        );
        void emitUnreadCountAfterCommit(socket.data.user.userIdx);
        ack?.({ success: true, data: { chatRoomIdx, joined: true, unreadCount } });
      } catch (error) {
        socketError(socket, SOCKET_EVENT.CHAT_JOIN, error, ack);
      }
    })();
  });

  // 채팅방 나갈 시에 room 에서 나가주기
  socket.on(SOCKET_EVENT.CHAT_LEAVE, (payload, ack) => {
    void (async () => {
      try {
        const chatRoomIdx = parsePositiveInteger(payload?.chatRoomIdx, "chatRoomIdx");
        if (Number(socket.data.activeChatRoomIdx) !== chatRoomIdx) {
          throw Object.assign(new Error("현재 입장한 채팅방이 아닙니다."), { code: "FORBIDDEN" });
        }
        await socket.leave(SOCKET_ROOM.chat(chatRoomIdx));
        socket.data.activeChatRoomIdx = null;
        ack?.({ success: true, data: { chatRoomIdx, left: true } });
      } catch (error) {
        socketError(socket, SOCKET_EVENT.CHAT_LEAVE, error, ack);
      }
    })();
  });

  // 채팅 송신 시 처리 이벤트
  socket.on(SOCKET_EVENT.CHAT_MESSAGE_SEND, (payload, ack) => {
    void (async () => {
      try {
        // DB에 TEXT 메시지 타입 생성 (이미지는 api로 처리)
        const result = await createTextMessage({
          io,
          userIdx: socket.data.user.userIdx,
          payload,
        });

        // 생성이 정상적으로 되면 양쪽으로 메시지 보내주기
        if (result.created) {
          try {
            // 새 채팅 채팅방에 넣어주기
            emitChatMessageNew(result.message.chatRoomIdx, result.message);
            // 채팅 목록에 보이는 채팅 정보 바꿔주기
            await emitRoomUpdatedAfterCommit(result.room, result.message);

            // 알림 줄게 있다면 받아야하는 사용자에게 알림 주기 (채팅방 안켜져있을 때)
            if (result.notification) {
              await emitNotificationAfterCommit(result.receiverIdx, result.notification);
            }
          } catch (error) {
            log.warn("저장된 채팅 메시지의 Socket 전송에 실패했습니다.", { error });
          }
        }

        ack?.({
          success: true,
          data: {
            clientMessageId: result.message.clientMessageId,
            messageIdx: result.message.messageIdx,
            createdAt: result.message.createdAt,
          },
        });
      } catch (error) {
        socketError(socket, SOCKET_EVENT.CHAT_MESSAGE_SEND, error, ack);
      }
    })();
  });

  socket.on(SOCKET_EVENT.CHAT_READ, (payload, ack) => {
    void (async () => {
      try {
        const chatRoomIdx = parsePositiveInteger(payload?.chatRoomIdx, "chatRoomIdx");
        await getChatRoomForParticipant(chatRoomIdx, socket.data.user.userIdx);
        const unreadCount = await withTransaction((client) =>
          markChatNotificationsRead(client, socket.data.user.userIdx, chatRoomIdx),
        );
        void emitUnreadCountAfterCommit(socket.data.user.userIdx);
        ack?.({ success: true, data: { chatRoomIdx, unreadCount } });
      } catch (error) {
        socketError(socket, SOCKET_EVENT.CHAT_READ, error, ack);
      }
    })();
  });
}
