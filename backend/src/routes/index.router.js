import { Router } from "express";

import { adminRouter } from "../modules/admin/admin.router.js";
import { auctionsRouter } from "../modules/auctions/auctions.router.js";
import { authRouter } from "../modules/auth/auth.router.js";
import { chatsRouter } from "../modules/chats/chats.router.js";
import { mainRouter } from "../modules/main/main.router.js";
import { mypageRouter } from "../modules/mypage/mypage.router.js";
import { notificationsRouter } from "../modules/notifications/notifications.router.js";
import { reviewsRouter } from "../modules/reviews/reviews.router.js";
import { transactionsRouter } from "../modules/transactions/transactions.router.js";
import { usedRouter } from "../modules/used/used.router.js";
import { usersRouter } from "../modules/users/users.router.js";

export const indexRouter = Router();

// 총 66개
indexRouter.use("/", mainRouter); // 1개 - category, search 주석처리
indexRouter.use("/auth", authRouter); // 11개
indexRouter.use("/users", usersRouter); // 7
indexRouter.use("/used", usedRouter); // 7
indexRouter.use("/auctions", auctionsRouter); // 9
indexRouter.use("/chats", chatsRouter); // 5
indexRouter.use("/transactions", transactionsRouter); // 4
indexRouter.use("/", reviewsRouter); // 2
indexRouter.use("/mypage", mypageRouter); // 6
indexRouter.use("/notifications", notificationsRouter); // 4
indexRouter.use("/admin", adminRouter); // 10
