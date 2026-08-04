import { Router } from "express";

import { requireAuth } from "../../common/auth/accessToken.js";

import {
  createChat,
  getChatDetail,
  listChatMessages,
  listChats,
  uploadChatImageMessage,
} from "./chats.controller.js";
import { chatImageUpload } from "./chat.upload.js";

export const chatsRouter = Router();

chatsRouter.use(requireAuth);
chatsRouter.get("/", listChats);
chatsRouter.post("/", createChat);
chatsRouter.get("/:chatRoomIdx", getChatDetail);
chatsRouter.get("/:chatRoomIdx/messages", listChatMessages);
chatsRouter.post("/:chatRoomIdx/messages/images", chatImageUpload, uploadChatImageMessage);
