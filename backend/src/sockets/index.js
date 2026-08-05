import { Server } from "socket.io";

import { logger } from "../common/logging/logger.js";
import { env } from "../config/env.js";
import { registerAuctionSocket } from "./auction.socket.js";
import { registerChatSocket } from "./chat.socket.js";
import { clearSocketServer, setSocketServer } from "./socket.context.js";
import { socketAuth } from "./socketAuth.js";

const log = logger.child("sockets/index.js")

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

    log.info("Socket connected", {
      socketId: socket.id,
    });

    // 채팅방 및 경매 전용 관리 소켓 함수를 통해 이벤트를 등록해주게됨.
    registerChatSocket(io, socket);
    registerAuctionSocket(io, socket);

    socket.on("disconnect", (reason) => {
      socket.data.activeChatRoomIdx = null;
      socket.data.activeAuctionListingIdx = null;
      
      // 사용자의 redis - session:userIdx:session_uuid 는 남겨주기
      // 사용자의 redis - 전화번호도 그대로 남겨주기 (어짜피 알아서 사라지니 로그인 다시 해서 하게 해주기)
      // Redis 결론 -> 사용자관련 redis는 그냥 그대로 두는것이 맞다.

      log.info("Socket disconnected", {
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