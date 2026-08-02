import { Router } from "express";

import {
  getUnreadNotificationCount,
  listNotifications,
  readAllNotifications,
  readNotification,
} from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", listNotifications);
notificationsRouter.patch("/:notificationIdx/read", readNotification);
notificationsRouter.patch("/read-all", readAllNotifications);
notificationsRouter.get("/unread-count", getUnreadNotificationCount);
