
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
}
