import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";

import { authApi } from "../api/appApi";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const socketRef = useRef(null);
  const refreshAttemptedRef = useRef(false);
  const [connectedSocket, setConnectedSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return undefined;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    const handleConnect = () => {
      refreshAttemptedRef.current = false;
      setConnectedSocket(socket);
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setConnectedSocket((current) => (current === socket ? null : current));
      setIsConnected(false);
    };

    const handleConnectError = () => {
      if (refreshAttemptedRef.current) {
        return;
      }

      refreshAttemptedRef.current = true;
      authApi.refresh()
        .then(() => socket.connect())
        .catch(() => socket.disconnect());
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.connect();

    return () => {
      // disconnect 이벤트에서 화면에 노출한 Socket 상태까지 함께 정리한다.
      socket.disconnect();
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [isLoggedIn]);

  const emitWithAck = useCallback((event, payload = {}, timeout = 10_000) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return Promise.reject(new Error("실시간 연결을 준비하는 중입니다."));
    }

    return new Promise((resolve, reject) => {
      socket.timeout(timeout).emit(event, payload, (timeoutError, response) => {
        if (timeoutError) {
          reject(new Error("실시간 요청 응답 시간이 초과되었습니다."));
          return;
        }

        if (!response?.success) {
          const error = new Error(response?.message ?? "실시간 요청을 처리하지 못했습니다.");
          error.code = response?.code ?? "SOCKET_ERROR";
          reject(error);
          return;
        }

        resolve(response.data);
      });
    });
  }, []);

  const value = useMemo(() => ({
    socket: isLoggedIn && isConnected ? connectedSocket : null,
    isConnected,
    emitWithAck,
  }), [connectedSocket, emitWithAck, isConnected, isLoggedIn]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket은 SocketProvider 내부에서 사용해야 합니다.");
  }
  return context;
}
