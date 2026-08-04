import {
  authenticateAccessToken,
  getAccessTokenFromCookieHeader,
} from "../common/auth/accessToken.js";
import { SOCKET_ROOM } from "../common/constants/socketRoom.js";

<<<<<<< Updated upstream
// 소켓 핸드셰이크 시 access_token을 이용하여 해당 사용자가 정상 사용 가능한 사용자인지 확인한 후
// socket.data.auth, socket.data.user에 데이터를 올바르게 넣어준 뒤
// socket.join(user:{user_idx}) 에 넣어주는 절차를 가짐
// 정확한건 아래의 TODO와 문서를 참고해야함
export function socketAuth(socket, next) {
  // TODO:
  // 1. Read access token from cookie first, then optional handshake auth token.
  // 2. Verify JWT signature, exp, and type === "access".
  // 3. Load user from DB and check deleted_at/banned_at.
  // 4. Set socket.data.auth and socket.data.user only after successful verification.
  // 5. Join SOCKET_ROOM.user(userIdx) only after user verification.
  //
  // Auth is not implemented yet. Do not create fake socket.data.auth/user here.
  next();
=======
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
>>>>>>> Stashed changes
}
