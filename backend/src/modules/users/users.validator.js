import { AppError } from "../../common/errors/AppError.js";

const PHONE_PATTERN = /^01[016789]\d{7,8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 문자열의 양쪽 공백을 제거한다. */
function text(value) { return typeof value === "string" ? value.trim() : ""; }

/** 비밀번호가 회원가입과 동일한 길이 및 문자 조합 조건을 만족하는지 확인한다. */
function isValidPassword(password) {
  if (password.length < 8 || password.length > 20) return false;
  return [/[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length >= 2;
}

/** 비밀번호 확인 요청의 현재 비밀번호를 검증한다. */
export function validatePasswordVerification(body = {}) {
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) throw new AppError(400, "VALIDATION_ERROR", "비밀번호를 입력해주세요.", { field: "password" });
  return password;
}

/** 회원정보 수정 요청의 토큰, 닉네임, 전화번호, 이메일과 선택적 비밀번호를 검증한다. */
export function validateAccountUpdate(body = {}) {
  const data = { editToken: text(body.editToken), nickname: text(body.nickname), phone: text(body.phone).replace(/[\s-]/g, ""), email: text(body.email) || null, phoneVerificationId: text(body.phoneVerificationId), password: typeof body.password === "string" ? body.password : "", passwordConfirm: typeof body.passwordConfirm === "string" ? body.passwordConfirm : "" };
  if (!data.editToken) throw new AppError(403, "EDIT_VERIFICATION_REQUIRED", "비밀번호 확인이 필요합니다.");
  if (data.nickname.length < 2 || data.nickname.length > 12) throw new AppError(400, "VALIDATION_ERROR", "닉네임은 2~12자로 입력해주세요.", { field: "nickname" });
  if (!PHONE_PATTERN.test(data.phone)) throw new AppError(400, "VALIDATION_ERROR", "전화번호를 확인해주세요.", { field: "phone" });
  if (data.email && !EMAIL_PATTERN.test(data.email)) throw new AppError(400, "VALIDATION_ERROR", "이메일 형식을 확인해주세요.", { field: "email" });
  if (data.password || data.passwordConfirm) {
    if (!isValidPassword(data.password)) throw new AppError(400, "VALIDATION_ERROR", "비밀번호는 영문, 숫자, 특수문자 중 2가지 이상을 조합한 8~20자여야 합니다.", { field: "password" });
    if (data.password !== data.passwordConfirm) throw new AppError(400, "VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.", { field: "passwordConfirm" });
  }
  return data;
}

/** 회원 탈퇴 요청에 비밀번호 확인으로 발급된 수정 토큰이 있는지 검증한다. */
export function validateWithdrawal(body = {}) {
  const editToken = text(body.editToken);
  if (!editToken) throw new AppError(403, "EDIT_VERIFICATION_REQUIRED", "비밀번호 확인이 필요합니다.");
  return editToken;
}
