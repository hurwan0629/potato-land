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
  emitChatRoomUpdated(room.sellerIdx, {
    chatRoomIdx: message.chatRoomIdx,
    listingIdx: Number(room.listingIdx),
    lastMessage,
    unreadCount: sellerUnreadCount,
    updatedAt: message.createdAt,
  });
  emitChatRoomUpdated(room.buyerIdx, {
    chatRoomIdx: message.chatRoomIdx,
    listingIdx: Number(room.listingIdx),
    lastMessage,
    unreadCount: buyerUnreadCount,
    updatedAt: message.createdAt,
  });
}

<<<<<<< Updated upstream
export function registerChatSocket(_io, socket) {
  socket.on(SOCKET_EVENT.CHAT_JOIN, (_payload, ack) => {
    // TODO: verify user, chat participant, read-only state, then join chat room.
    ackNotImplemented(ack, "채팅방 입장");
  });

  socket.on(SOCKET_EVENT.CHAT_LEAVE, (_payload, ack) => {
    // TODO: verify active chat room and leave chat room.
    ackNotImplemented(ack, "채팅방 퇴장");
  });

  socket.on(SOCKET_EVENT.CHAT_MESSAGE_SEND, (_payload, ack) => {
    // TODO: validate message, persist chat_messages, conditionally save notification, emit chat events.
    ackNotImplemented(ack, "채팅 메시지 전송");
  });

  socket.on(SOCKET_EVENT.CHAT_READ, (_payload, ack) => {
    // TODO: mark saved NEW_MESSAGE notifications for this chat room as read.
    ackNotImplemented(ack, "채팅 읽음 처리");
=======
export function registerChatSocket(io, socket) {
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

  socket.on(SOCKET_EVENT.CHAT_MESSAGE_SEND, (payload, ack) => {
    void (async () => {
      try {
        const result = await createTextMessage({
          io,
          userIdx: socket.data.user.userIdx,
          payload,
        });
        if (result.created) {
          try {
            emitChatMessageNew(result.message.chatRoomIdx, result.message);
            await emitRoomUpdatedAfterCommit(result.room, result.message);
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
>>>>>>> Stashed changes
  });
}
