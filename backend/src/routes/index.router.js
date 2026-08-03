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

// 업무 API 총 68개이며 /health는 app.js에 별도로 있다.
indexRouter.use("/", mainRouter); // 2개 - 통합 search는 MVP에서 제외
indexRouter.use("/auth", authRouter); // 11개
indexRouter.use("/users", usersRouter); // 7개
indexRouter.use("/used", usedRouter); // 7
indexRouter.use("/auctions", auctionsRouter); // 9
indexRouter.use("/chats", chatsRouter); // 5
indexRouter.use("/transactions", transactionsRouter); // 4
indexRouter.use("/reviews", reviewsRouter); // 2
indexRouter.use("/mypage", mypageRouter); // 5개
indexRouter.use("/notifications", notificationsRouter); // 4
indexRouter.use("/admin", adminRouter); // 12개
