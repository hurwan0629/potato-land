import { AppError } from "../../common/errors/AppError.js";

const PHONE_PATTERN = /^01[016789]\d{7,8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPassword(password) {
  if (password.length < 8 || password.length > 20) return false;
  return [/[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length >= 2;
}

export function validateUserIdx(value) {
  const userIdx = Number(value);
  if (!Number.isSafeInteger(userIdx) || userIdx <= 0) {
    throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "올바른 사용자 식별자가 필요합니다.", details: { field: "userIdx" } });
  }
  return userIdx;
}

export function validatePasswordVerification(body = {}) {
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "비밀번호를 입력해주세요.", details: { field: "password" } });
  return password;
}

/**
 * 최종 이름은 newPassword/newPasswordConfirm이다.
 * 기존 프런트 호환을 위해 password/passwordConfirm도 입력 alias로만 허용한다.
 */
export function validateAccountUpdate(body = {}) {
  const newPassword = typeof body.newPassword === "string"
    ? body.newPassword
    : typeof body.password === "string" ? body.password : "";
  const newPasswordConfirm = typeof body.newPasswordConfirm === "string"
    ? body.newPasswordConfirm
    : typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";

  const data = {
    editToken: text(body.editToken),
    nickname: text(body.nickname),
    phone: text(body.phone).replace(/[\s-]/g, ""),
    email: text(body.email) || null,
    phoneVerificationId: text(body.phoneVerificationId),
    newPassword,
    newPasswordConfirm,
  };

  if (!data.editToken) throw new AppError({ status: 403, code: "EDIT_VERIFICATION_REQUIRED", message: "비밀번호 확인이 필요합니다." });
  if (data.nickname.length < 2 || data.nickname.length > 12) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "닉네임은 2~12자로 입력해주세요.", details: { field: "nickname" } });
  if (!PHONE_PATTERN.test(data.phone)) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "전화번호를 확인해주세요.", details: { field: "phone" } });
  if (data.email && !EMAIL_PATTERN.test(data.email)) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "이메일 형식을 확인해주세요.", details: { field: "email" } });
  if (data.newPassword || data.newPasswordConfirm) {
    if (!isValidPassword(data.newPassword)) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "비밀번호는 영문, 숫자, 특수문자 중 2가지 이상을 조합한 8~20자여야 합니다.", details: { field: "newPassword" } });
    if (data.newPassword !== data.newPasswordConfirm) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "비밀번호가 일치하지 않습니다.", details: { field: "newPasswordConfirm" } });
  }
  return data;
}

export function validateWithdrawal(body = {}) {
  const editToken = text(body.editToken);
  if (!editToken) throw new AppError({ status: 403, code: "EDIT_VERIFICATION_REQUIRED", message: "비밀번호 확인이 필요합니다." });
  return editToken;
}

export function validatePublicProfileUpdate(body = {}, files = []) {
  const bio = text(body.bio) || null;
  if (bio && bio.length > 255) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "소개는 255자 이하여야 합니다.", details: { field: "bio" } });
  if (files.length > 1) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "프로필 이미지는 한 장만 등록할 수 있습니다.", details: { field: "image" } });
  return { bio, profileImageUrl: files[0]?.resourceUrl };
}
