import { authenticateAccessToken, getAccessTokenFromCookieHeader } from "../common/auth/accessToken.js";
import { SOCKET_ROOM } from "../common/constants/socketRoom.js";

/** Socket 연결 시 쿠키의 Access Token과 현재 계정 상태를 검증한다. */
export async function socketAuth(socket, next) {
  try {
    // 브라우저 쿠키를 우선 사용하고, 비브라우저 클라이언트는 auth token을 대체 수단으로 사용한다.
    const cookieToken = getAccessTokenFromCookieHeader(socket.handshake.headers.cookie);
    const authToken = socket.handshake.auth?.accessToken ?? socket.handshake.auth?.token;
    const authenticated = await authenticateAccessToken(cookieToken ?? authToken);

    // 이후 채팅·알림 이벤트가 공통으로 사용할 인증 정보와 개인 알림 room을 설정한다.
    socket.data.auth = authenticated.auth;
    socket.data.user = authenticated.user;
    socket.data.activeChatRoomIdx = null;
    socket.data.activeAuctionListingIdx = null;
    await socket.join(SOCKET_ROOM.user(authenticated.user.userIdx));
    next();
  } catch (cause) {
    const error = new Error("Socket 인증에 실패했습니다.");
    error.data = { code: cause.code ?? "UNAUTHORIZED", message: cause.message ?? "로그인이 필요합니다." };
    next(error);
  }
}
