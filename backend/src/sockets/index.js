import { Server } from "socket.io";

import { logger } from "../common/logging/logger.js";
import { env } from "../config/env.js";
import { registerAuctionSocket } from "./auction.socket.js";
import { registerChatSocket } from "./chat.socket.js";
import { clearSocketServer, setSocketServer } from "./socket.context.js";
import { socketAuth } from "./socketAuth.js";
import { getUnreadNotificationCount } from "../modules/notifications/notifications.service.js";
import { query } from "../infrastructure/database/database.js";
import { SOCKET_EVENT } from "../common/constants/socketEvent.js";

// server.js에서 호출된 함수를 이용하여 io 서버를 생성 후 
// origin을 이용하여 cors 설정을 해주게 됨. 
// 이때 access_token이 필수이기 때문에 credentials: true 로 설정해주게 됨.
export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.client.origin,
      credentials: true,
    },
  });

  setSocketServer(io);
  io.use(socketAuth);

  io.on("connection", (socket) => {
    // 첫 연결 시에는 기본적으로 null
    // 연결한다면 client에서 join 요청을 넣게됨
    socket.data.activeChatRoomIdx = null;
    socket.data.activeAuctionListingIdx = null;

    logger.info("Socket connected", {
      socketId: socket.id,
    });

    void getUnreadNotificationCount(query, socket.data.user.userIdx)
      .then((unreadCount) => socket.emit(SOCKET_EVENT.NOTIFICATION_UNREAD_COUNT, { unreadCount }))
      .catch((error) => logger.warn("초기 알림 미확인 수 전송에 실패했습니다.", { error, socketId: socket.id }));

    // 채팅방 및 경매 전용 관리 소켓 함수를 통해 이벤트를 등록해주게됨.
    registerChatSocket(io, socket);
    registerAuctionSocket(io, socket);

    socket.on("disconnect", (reason) => {
      socket.data.activeChatRoomIdx = null;
      socket.data.activeAuctionListingIdx = null;

      logger.info("Socket disconnected", {
        socketId: socket.id,
        reason,
      });
    });
  });

  return {
    io,
    close(callback) {
      io.close(() => {
        clearSocketServer();
        if (typeof callback === "function") {
          callback();
        }
      });
    },
  };
}
