import assert from "node:assert/strict";
import test from "node:test";

import { validateLogin, validateSignup } from "../src/modules/auth/auth.validator.js";

/** SMS 인증 필드 없이도 유효한 회원가입 요청이 통과하는지 검증한다. */
test("validateSignup accepts signup data without SMS verification fields", () => {
  const result = validateSignup({
    name: "홍길동",
    nickname: "감자왕",
    loginId: "potato123",
    password: "Password123!",
    passwordConfirm: "Password123!",
    phone: "010-1234-5678",
    email: "user@example.com",
    termsAgreed: true,
  });
  assert.equal(result.phone, "01012345678");
  assert.equal(result.loginId, "potato123");
});

/** 서로 다른 비밀번호와 확인값이 검증 오류로 차단되는지 검증한다. */
test("validateSignup rejects a different password confirmation", () => {
  assert.throws(
    () => validateSignup({ name: "홍길동", nickname: "감자왕", loginId: "potato123", password: "Password123!", passwordConfirm: "Other123!", phone: "01012345678", termsAgreed: true }),
    (error) => error.code === "VALIDATION_ERROR" && error.details.field === "passwordConfirm",
  );
});

/** 로그인 필수값이 없을 때 인증 API 호출 전에 검증 오류가 발생하는지 확인한다. */
test("validateLogin requires loginId and password", () => {
  assert.throws(() => validateLogin({ loginId: "", password: "" }), (error) => error.code === "VALIDATION_ERROR");
});
