import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import { authApi } from "../api/authApi";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isLoggedIn, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const refreshTriedRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocket(null);
      setIsConnected(false);
      return undefined;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
    const nextSocket = io(socketUrl, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
    });
    socketRef.current = nextSocket;
    setSocket(nextSocket);

    const handleConnect = () => {
      refreshTriedRef.current = false;
      setIsConnected(true);
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = async () => {
      if (!refreshTriedRef.current) {
        refreshTriedRef.current = true;
        try {
          await authApi.refresh();
          nextSocket.connect();
          return;
        } catch {
          // 아래에서 로그인 상태를 정리한다.
        }
      }
      nextSocket.disconnect();
      await logout();
    };

    nextSocket.on("connect", handleConnect);
    nextSocket.on("disconnect", handleDisconnect);
    nextSocket.on("connect_error", handleConnectError);
    nextSocket.connect();

    return () => {
      nextSocket.off("connect", handleConnect);
      nextSocket.off("disconnect", handleDisconnect);
      nextSocket.off("connect_error", handleConnectError);
      nextSocket.disconnect();
      if (socketRef.current === nextSocket) socketRef.current = null;
    };
  }, [isLoggedIn, logout]);

  const emitWithAck = useCallback((event, payload, timeout = 10_000) => {
    const currentSocket = socketRef.current;
    if (!currentSocket?.connected) {
      return Promise.reject(new Error("실시간 연결이 준비되지 않았습니다."));
    }
    return new Promise((resolve, reject) => {
      currentSocket.timeout(timeout).emit(event, payload, (timeoutError, response) => {
        if (timeoutError) {
          reject(new Error("서버 응답 시간이 초과되었습니다."));
          return;
        }
        if (!response?.success) {
          const error = new Error(response?.message ?? "요청을 처리하지 못했습니다.");
          error.code = response?.code;
          reject(error);
          return;
        }
        resolve(response.data);
      });
    });
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, emitWithAck }}>
      {children}
    </SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket은 SocketProvider 내부에서 사용해야 합니다.");
  return context;
}
