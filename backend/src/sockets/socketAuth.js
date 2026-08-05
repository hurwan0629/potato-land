// import {
//   authenticateAccessToken,
//   getAccessTokenFromCookieHeader,
// } from "../common/auth/accessToken.js";
// import { SOCKET_ROOM } from "../common/constants/socketRoom.js";

// export async function socketAuth(socket, next) {
//   try {
//     const cookieToken = getAccessTokenFromCookieHeader(socket.handshake.headers.cookie);
//     const authToken = socket.handshake.auth?.accessToken ?? socket.handshake.auth?.token;
//     const authenticated = await authenticateAccessToken(cookieToken ?? authToken);

//     socket.data.auth = authenticated.auth;
//     socket.data.user = authenticated.user;
//     socket.data.activeChatRoomIdx = null;
//     socket.data.activeAuctionListingIdx = null;
//     await socket.join(SOCKET_ROOM.user(authenticated.user.userIdx));
//     next();
//   } catch (cause) {
//     const error = new Error("Socket 인증에 실패했습니다.");
//     error.data = {
//       code: cause.code ?? "UNAUTHORIZED",
//       message: cause.message ?? "로그인이 필요합니다.",
//     };
//     next(error);
//   }

// 소켓 핸드셰이크 시 access_token을 이용하여 해당 사용자가 정상 사용 가능한 사용자인지 확인한 후
// socket.data.auth, socket.data.user에 데이터를 올바르게 넣어준 뒤
// socket.join(user:{user_idx}) 에 넣어주는 절차를 가짐
// 정확한건 아래의 TODO와 문서를 참고해야함
export function socketAuth(socket, next) {
  // TODO 처리 순서:
  // 1. cookie의 access token을 먼저 읽고 없으면 handshake.auth의 token을 확인한다.
  
  // 2. JWT 서명, 만료 시각, type=access를 검증한다.
  // 3. DB에서 사용자를 다시 조회해 탈퇴·영구정지 상태를 차단한다.
  // 4. 성공한 경우에만 socket.data.auth와 socket.data.user를 채운다.
  // 5. 개인 알림을 받을 SOCKET_ROOM.user(userIdx)에 가입시킨 뒤 next()를 호출한다.
  // 인증 구현 전에는 가짜 auth/user 데이터를 만들지 않는다.
  next();
}
