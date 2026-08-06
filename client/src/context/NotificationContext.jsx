import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { notificationsApi } from "../api/appApi";
import { SOCKET_EVENT } from "../constants/socketEvents";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isLoggedIn) {
      return;
    }

    setIsLoading(true);
    try {
      const [notificationData, unreadData] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(notificationData?.items ?? []);
      setUnreadCount(Number(unreadData?.unreadCount ?? 0));
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    let active = true;

    if (!isLoggedIn) {
      Promise.resolve().then(() => {
        if (active) {
          setNotifications([]);
          setUnreadCount(0);
          setIsLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    notificationsApi.list()
      .then((result) => {
        if (active) {
          setNotifications(result?.items ?? []);
        }
      })
      .catch(() => {});

    notificationsApi.unreadCount()
      .then((result) => {
        if (active) {
          setUnreadCount(Number(result?.unreadCount ?? 0));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleNewNotification = (notification) => {
      setNotifications((current) => {
        const exists = current.some(
          (item) => Number(item.notificationIdx) === Number(notification.notificationIdx),
        );
        return exists ? current : [notification, ...current];
      });
    };

    const handleUnreadCount = ({ unreadCount: nextUnreadCount }) => {
      setUnreadCount(Number(nextUnreadCount ?? 0));
    };

    socket.on(SOCKET_EVENT.NOTIFICATION_NEW, handleNewNotification);
    socket.on(SOCKET_EVENT.NOTIFICATION_UNREAD_COUNT, handleUnreadCount);

    return () => {
      socket.off(SOCKET_EVENT.NOTIFICATION_NEW, handleNewNotification);
      socket.off(SOCKET_EVENT.NOTIFICATION_UNREAD_COUNT, handleUnreadCount);
    };
  }, [socket]);

  const read = useCallback(async (notificationIdx) => {
    await notificationsApi.read(notificationIdx);
    setNotifications((current) => current.map((notification) => (
      Number(notification.notificationIdx) === Number(notificationIdx)
        ? { ...notification, isRead: true }
        : notification
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
  }, []);

  const readAll = useCallback(async () => {
    await notificationsApi.readAll();
    setNotifications((current) => current.map((notification) => ({
      ...notification,
      isRead: true,
    })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    reload,
    read,
    readAll,
  }), [isLoading, notifications, read, readAll, reload, unreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications는 NotificationProvider 내부에서 사용해야 합니다.");
  }
  return context;
}
