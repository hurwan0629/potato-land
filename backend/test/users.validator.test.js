import assert from "node:assert/strict";
import test from "node:test";

import { validateAccountUpdate, validatePasswordVerification, validateWithdrawal } from "../src/modules/users/users.validator.js";

const validUpdate = { verificationToken: "verification-token", nickname: "감자왕", phone: "010-1234-5678", email: "potato@example.com", password: "", passwordConfirm: "" };

/** 회원정보 수정 전 현재 비밀번호 입력을 필수로 검증한다. */
test("validatePasswordVerification requires password", () => {
  assert.throws(() => validatePasswordVerification({ password: "" }), (error) => error.code === "VALIDATION_ERROR");
});

/** 비밀번호를 변경하지 않는 회원정보 수정 요청을 허용한다. */
test("validateAccountUpdate accepts profile-only changes", () => {
  const result = validateAccountUpdate(validUpdate);
  assert.equal(result.phone, "01012345678");
  assert.equal(result.password, "");
});

/** 회원가입과 동일한 규칙을 만족하지 않는 새 비밀번호를 차단한다. */
test("validateAccountUpdate rejects weak new password", () => {
  assert.throws(() => validateAccountUpdate({ ...validUpdate, password: "password", passwordConfirm: "password" }), (error) => error.code === "VALIDATION_ERROR" && error.details.field === "password");
});

/** 추가 개인정보 없이 탈퇴용 수정 토큰만 검증한다. */
test("validateWithdrawal accepts edit token only", () => {
  assert.equal(validateWithdrawal({ verificationToken: "verification-token" }), "verification-token");
});
