import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";
import { notFoundMiddleware } from "./common/middlewares/notFound.middleware.js";
import { indexRouter } from "./routes/index.router.js";
import { logger } from "./common/logging/logger.js";
import { query } from "./infrastructure/database/database.js";
import { getUploadRootDirectory } from "./infrastructure/uploads/upload.js";

/** Express 애플리케이션 인스턴스를 생성해 서버와 테스트에서 공유한다. */
export const app = express();

const log = logger.child("app");

// 브라우저 쿠키 인증을 사용하는 클라이언트 origin만 CORS로 허용한다.
app.use(
  cors({
    origin: env.client.origin,
    credentials: true,
  }),
);
app.use(cookieParser());

// 운영 환경과 개발 환경에 맞는 요청 로그 형식을 선택한다.
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 업로드된 정적 리소스를 /resources 하위 URL로 제공한다.
app.use(
  "/resources",
  express.static(getUploadRootDirectory()),
);

// 서버 프로세스가 요청을 처리할 수 있는지 확인하는 기본 health check다.
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
    },
  });
});

// DB 연결과 users 테이블 존재 여부를 함께 확인하는 health check다.
app.get("/health/database", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        CURRENT_DATABASE() AS database_name,
        CURRENT_USER AS database_user,
        NOW() AS database_time,
        TO_REGCLASS('public.users') AS users_table
    `);

    return res.status(200).json({
      success: true,
      data: {
        connected: true,
        usersTableExists: rows[0].users_table !== null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// 업무 API 라우터를 /api prefix 아래에 연결한다.
app.use("/api", indexRouter);

// 등록되지 않은 라우트와 throw된 오류는 마지막 공통 middleware에서 처리한다.
app.use(notFoundMiddleware);
app.use(errorMiddleware);
