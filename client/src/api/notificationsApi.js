import { http } from "./http";

function unwrap(response) {
  return response?.data ?? response;
}

export const notificationsApi = {
  list: ({ unreadOnly = false, page = 1, limit = 20 } = {}) =>
    http.get(`/notifications?unreadOnly=${unreadOnly}&page=${page}&limit=${limit}`).then(unwrap),
  read: (notificationIdx) => http.patch(`/notifications/${notificationIdx}/read`, {}).then(unwrap),
  readAll: () => http.patch("/notifications/read-all", {}).then(unwrap),
  unreadCount: () => http.get("/notifications/unread-count").then(unwrap),
};
