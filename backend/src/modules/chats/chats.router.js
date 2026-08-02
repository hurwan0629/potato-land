import { Router } from "express";

import {
  createChat,
  getChatDetail,
  listChatMessages,
  listChats,
  uploadChatImageMessage,
} from "./chats.controller.js";

export const chatsRouter = Router();

chatsRouter.get("/", listChats);
chatsRouter.post("/", createChat);
chatsRouter.get("/:chatRoomIdx", getChatDetail);
chatsRouter.get("/:chatRoomIdx/messages", listChatMessages);
chatsRouter.post("/:chatRoomIdx/messages/images", uploadChatImageMessage);
