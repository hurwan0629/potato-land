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

/** 도메인별 라우터를 /api 하위 경로로 묶는 최상위 라우터다. */
export const indexRouter = Router();

// canonical 업무 API는 68개다. 호환 alias와 session 관리 보조 URL, /health는 개수에서 제외한다.
indexRouter.use("/", mainRouter); // 2개 - 통합 search는 MVP에서 제외
indexRouter.use("/auth", authRouter); // canonical 11개 + session 관리 보조 URL
indexRouter.use("/users", usersRouter); // canonical 7개 + /me/password 호환 alias
indexRouter.use("/used", usedRouter); // 7
indexRouter.use("/auctions", auctionsRouter); // 9
indexRouter.use("/chats", chatsRouter); // 5
indexRouter.use("/transactions", transactionsRouter); // 4
indexRouter.use("/reviews", reviewsRouter); // 2
indexRouter.use("/mypage", mypageRouter); // 5개
indexRouter.use("/notifications", notificationsRouter); // 4
indexRouter.use("/admin", adminRouter); // 12개
