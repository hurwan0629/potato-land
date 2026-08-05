import assert from "node:assert/strict";
import test from "node:test";

Object.assign(process.env, {
  CLIENT_ORIGIN: "http://localhost:5173",
  DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
  REDIS_URL: "redis://default:test@127.0.0.1:6379",
  ACCESS_TOKEN_SECRET: "test-access-secret-with-sufficient-length",
  REFRESH_TOKEN_SECRET: "test-refresh-secret-with-sufficient-length",
});

const { createLoginTokens, verifyRefreshToken } = await import("../src/modules/auth/auth.token.js");

const user = { idx: 1, role: "USER" };

/** 로그인용 Refresh Token에서 사용자와 기기 세션 claim을 정상적으로 복원한다. */
test("verifyRefreshToken reads a valid refresh token", () => {
  const tokens = createLoginTokens(user);
  const session = verifyRefreshToken(tokens.refreshToken);

  assert.equal(session.userIdx, user.idx);
  assert.equal(session.sessionId, tokens.sessionId);
  assert.equal(session.refreshJti, tokens.refreshJti);
});

/** Rotation용 토큰은 같은 기기 sid를 유지하면서 새로운 jti를 사용한다. */
test("createLoginTokens rotates jti while preserving session id", () => {
  const previous = createLoginTokens(user);
  const next = createLoginTokens(user, { sessionId: previous.sessionId });

  assert.equal(next.sessionId, previous.sessionId);
  assert.notEqual(next.refreshJti, previous.refreshJti);
});

/** Access Token을 Refresh Token으로 오인해 재발급하지 못하도록 차단한다. */
test("verifyRefreshToken rejects an access token", () => {
  const tokens = createLoginTokens(user);
  assert.throws(() => verifyRefreshToken(tokens.accessToken));
});
