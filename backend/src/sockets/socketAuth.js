import {
  authenticateAccessToken,
  getAccessTokenFromCookieHeader,
} from "../common/auth/accessToken.js";
import { SOCKET_ROOM } from "../common/constants/socketRoom.js";

export async function socketAuth(socket, next) {
  try {
    const cookieToken = getAccessTokenFromCookieHeader(socket.handshake.headers.cookie);
    const authToken = socket.handshake.auth?.accessToken ?? socket.handshake.auth?.token;
    const authenticated = await authenticateAccessToken(cookieToken ?? authToken);

    socket.data.auth = authenticated.auth;
    socket.data.user = authenticated.user;
    socket.data.activeChatRoomIdx = null;
    socket.data.activeAuctionListingIdx = null;
    await socket.join(SOCKET_ROOM.user(authenticated.user.userIdx));
    next();
  } catch (cause) {
    const error = new Error("Socket 인증에 실패했습니다.");
    error.data = {
      code: cause.code ?? "UNAUTHORIZED",
      message: cause.message ?? "로그인이 필요합니다.",
    };
    next(error);
  }
}
