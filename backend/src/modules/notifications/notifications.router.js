import { Router } from "express";

import { requireAuth } from "../../common/auth/accessToken.js";

import {
  getUnreadNotificationCount,
  listNotifications,
  readAllNotifications,
  readNotification,
} from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get("/", listNotifications);
notificationsRouter.patch("/:notificationIdx/read", readNotification);
notificationsRouter.patch("/read-all", readAllNotifications);
notificationsRouter.get("/unread-count", getUnreadNotificationCount);
