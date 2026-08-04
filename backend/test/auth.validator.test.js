import assert from "node:assert/strict";
import test from "node:test";

import { validateFindLoginId, validateLogin, validatePhoneSend, validatePhoneVerify, validateResetPassword, validateSignup } from "../src/modules/auth/auth.validator.js";

const validSignup = { name: "홍길동", nickname: "감자왕", loginId: "potato123", password: "Password123!", passwordConfirm: "Password123!", phone: "010-1234-5678", email: "user@example.com", termsAgreed: true, phoneVerificationId: "verification-id" };

/** 휴대전화 인증 식별자를 포함한 올바른 회원가입 요청을 정규화한다. */
test("validateSignup accepts verified signup data", () => {
  const result = validateSignup(validSignup);
  assert.equal(result.phone, "01012345678");
  assert.equal(result.phoneVerificationId, "verification-id");
});

/** 휴대전화 인증 식별자가 없는 회원가입 요청을 차단한다. */
test("validateSignup requires phone verification id", () => {
  assert.throws(() => validateSignup({ ...validSignup, phoneVerificationId: "" }), (error) => error.code === "VALIDATION_ERROR" && error.details.field === "phoneVerificationId");
});

/** 서로 다른 비밀번호와 확인값을 검증 오류로 차단한다. */
test("validateSignup rejects a different password confirmation", () => {
  assert.throws(() => validateSignup({ ...validSignup, passwordConfirm: "Other123!" }), (error) => error.code === "VALIDATION_ERROR" && error.details.field === "passwordConfirm");
});

/** 로그인 필수값이 없을 때 인증 API 호출 전에 검증 오류가 발생하는지 확인한다. */
test("validateLogin requires loginId and password", () => {
  assert.throws(() => validateLogin({ loginId: "", password: "" }), (error) => error.code === "VALIDATION_ERROR");
});

/** 영문과 숫자 두 종류로 구성된 8~20자 비밀번호를 허용한다. */
test("validateSignup accepts two password character categories", () => {
  const result = validateSignup({ ...validSignup, password: "Password123", passwordConfirm: "Password123" });
  assert.equal(result.password, "Password123");
});

/** 20자를 초과한 비밀번호를 검증 오류로 차단한다. */
test("validateSignup rejects a password longer than 20 characters", () => {
  const password = "Password1234567890123";
  assert.throws(() => validateSignup({ ...validSignup, password, passwordConfirm: password }), (error) => error.code === "VALIDATION_ERROR" && error.details.field === "password");
});

/** 발송 요청의 하이픈 포함 번호와 소문자 목적을 정규화한다. */
test("validatePhoneSend normalizes phone request", () => {
  assert.deepEqual(validatePhoneSend({ phone: "010-1234-5678", purpose: "signup" }), { phone: "01012345678", purpose: "SIGNUP", name: "", loginId: "" });
});

/** 아이디 찾기 인증번호 발송 전에 이름을 필수로 검증한다. */
test("validatePhoneSend requires name for finding login id", () => {
  assert.throws(() => validatePhoneSend({ phone: "01012345678", purpose: "FIND_ID" }), (error) => error.code === "VALIDATION_ERROR" && error.details.field === "name");
});

/** 비밀번호 찾기 인증번호 발송 전에 이름과 아이디를 함께 검증한다. */
test("validatePhoneSend accepts password reset account data", () => {
  assert.deepEqual(validatePhoneSend({ phone: "01012345678", purpose: "RESET_PASSWORD", name: "허완", loginId: "test3" }), { phone: "01012345678", purpose: "RESET_PASSWORD", name: "허완", loginId: "test3" });
});

/** 인증번호 확인 요청은 정확한 6자리 숫자만 허용한다. */
test("validatePhoneVerify rejects invalid code", () => {
  assert.throws(() => validatePhoneVerify({ phone: "01012345678", purpose: "SIGNUP", phoneVerificationId: "id", code: "12345" }), (error) => error.code === "VALIDATION_ERROR" && error.details.field === "code");
});

/** 아이디 찾기 요청의 이름과 휴대전화 인증 식별자를 검증한다. */
test("validateFindLoginId accepts verified account data", () => {
  assert.deepEqual(validateFindLoginId({ name: "홍길동", phone: "010-1234-5678", phoneVerificationId: "find-id-verification" }), { name: "홍길동", phone: "01012345678", phoneVerificationId: "find-id-verification" });
});

/** 비밀번호 재설정 요청에서 서로 다른 새 비밀번호를 차단한다. */
test("validateResetPassword rejects a different password confirmation", () => {
  assert.throws(() => validateResetPassword({ loginId: "potato123", name: "홍길동", phone: "01012345678", phoneVerificationId: "reset-verification", password: "NewPassword123!", passwordConfirm: "OtherPassword123!" }), (error) => error.code === "VALIDATION_ERROR" && error.details.field === "passwordConfirm");
});
