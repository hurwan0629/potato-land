import path from "node:path";
import { fileURLToPath } from "node:url";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";
import { notFoundMiddleware } from "./common/middlewares/notFound.middleware.js";
import { indexRouter } from "./routes/index.router.js";
import { query } from "./infrastructure/database/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(
  cors({
    origin: env.client.origin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/resources",
  express.static(path.resolve(__dirname, "..", env.uploads.baseDir)),
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
    },
  });
});

// API 주소로 DATABASE 연결 확인
// http://localhost:8080/health/database
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
      data: rows[0],
    });
  } catch (error) {
    return next(error);
  }
});

app.use("/api", indexRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
