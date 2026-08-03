import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../src/common/errors/AppError.js";
import { errorMiddleware } from "../src/common/middlewares/error.middleware.js";

function createResponse() {
  return {
    headersSent: false,
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("예상 가능한 AppError는 code, message, details를 응답한다", () => {
  const response = createResponse();
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    errorMiddleware(
      new AppError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "입력값을 확인해주세요.",
        details: { field: "title" },
      }),
      { method: "POST", originalUrl: "/api/used" },
      response,
      () => {},
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    success: false,
    code: "VALIDATION_ERROR",
    message: "입력값을 확인해주세요.",
    details: { field: "title" },
  });
});

test("알 수 없는 500 오류의 내부 메시지는 노출하지 않는다", () => {
  const response = createResponse();
  const originalError = console.error;
  console.error = () => {};

  try {
    errorMiddleware(
      new Error("DB password leaked"),
      { method: "GET", originalUrl: "/api/main" },
      response,
      () => {},
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "서버 오류가 발생했습니다.",
  });
});
