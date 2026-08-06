import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { notificationsApi } from "../api/notificationsApi";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    const data = await notificationsApi.list();
    setNotifications(data.items ?? []);
  }, [isLoggedIn]);

  const refreshUnreadCount = useCallback(async () => {
    if (!isLoggedIn) return;
    const data = await notificationsApi.unreadCount();
    setUnreadCount(data.unreadCount ?? 0);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void loadNotifications().catch(() => {});
    void refreshUnreadCount().catch(() => {});
  }, [isLoggedIn, loadNotifications, refreshUnreadCount]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleNew = (notification) => {
      setNotifications((current) => {
        if (current.some((item) => item.notificationIdx === notification.notificationIdx)) return current;
        return [notification, ...current];
      });
    };
    const handleUnreadCount = ({ unreadCount: nextUnreadCount }) => {
      setUnreadCount(nextUnreadCount ?? 0);
    };
    socket.on("notification:new", handleNew);
    socket.on("notification:unread-count", handleUnreadCount);
    return () => {
      socket.off("notification:new", handleNew);
      socket.off("notification:unread-count", handleUnreadCount);
    };
  }, [socket]);

  const readNotification = useCallback(async (notificationIdx) => {
    await notificationsApi.read(notificationIdx);
    setNotifications((current) => current.map((item) => (
      item.notificationIdx === notificationIdx ? { ...item, isRead: true } : item
    )));
    await refreshUnreadCount();
  }, [refreshUnreadCount]);

  const readAllNotifications = useCallback(async () => {
    await notificationsApi.readAll();
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loadNotifications,
      readNotification,
      readAllNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications는 NotificationProvider 내부에서 사용해야 합니다.");
  return context;
}
