// 해당 서버에서 유일한 ioInstance 가 됨.
// setSocketServer을 동작될 시 해당 ioInstance에 싱글톤으로 관리될 ioInstance개 생성되게 됨
let ioInstance = null;

export function setSocketServer(io) {
  ioInstance = io;
}

// 서버 밖에서도 io 서버 사용 가능하게 한곳에서 저장 확실하게 해두기
export function getSocketServer() {
  if (!ioInstance) {
    throw new Error("Socket.IO server has not been initialized.");
  }

  return ioInstance;
}

export function clearSocketServer() {
  ioInstance = null;
}
