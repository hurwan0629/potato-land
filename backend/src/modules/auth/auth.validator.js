import { AppError } from "../../common/errors/AppError.js";

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9]{4,20}$/;
const PHONE_PATTERN = /^01[016789]\d{7,8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CODE_PATTERN = /^\d{6}$/;
const PHONE_PURPOSES = new Set(["SIGNUP", "FIND_ID", "RESET_PASSWORD", "CHANGE_PHONE"]);

/** 문자열 입력값의 양쪽 공백을 제거한다. */
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** 휴대전화 번호에서 하이픈과 공백을 제거한다. */
function normalizePhone(value) {
  return text(value).replace(/[\s-]/g, "");
}

/** 비밀번호가 8~20자이며 영문·숫자·특수문자 중 두 종류 이상인지 확인한다. */
function isValidPassword(password) {
  if (password.length < 8 || password.length > 20) return false;
  return [/[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length >= 2;
}

/** 휴대전화 번호와 인증 목적을 공통 검증한다. */
function validatePhoneBase(body = {}) {
  const phone = normalizePhone(body.phone);
  const purpose = text(body.purpose).toUpperCase();
  if (!PHONE_PATTERN.test(phone)) throw new AppError(400, "VALIDATION_ERROR", "휴대전화 번호 형식을 확인해주세요.", { field: "phone" });
  if (!PHONE_PURPOSES.has(purpose)) throw new AppError(400, "VALIDATION_ERROR", "올바른 휴대전화 인증 목적이 아닙니다.", { field: "purpose" });
  return { phone, purpose };
}

/** 회원가입 입력값과 휴대전화 인증 식별자를 검증한다. */
export function validateSignup(body = {}) {
  const data = {
    name: text(body.name), nickname: text(body.nickname), loginId: text(body.loginId),
    password: typeof body.password === "string" ? body.password : "",
    passwordConfirm: typeof body.passwordConfirm === "string" ? body.passwordConfirm : "",
    phone: normalizePhone(body.phone), email: text(body.email) || null,
    termsAgreed: body.termsAgreed === true, phoneVerificationId: text(body.phoneVerificationId),
  };
  const requiredFields = ["name", "nickname", "loginId", "password", "passwordConfirm", "phone", "phoneVerificationId"];
  const missingField = requiredFields.find((field) => !data[field]);
  if (missingField) throw new AppError(400, "VALIDATION_ERROR", "필수 입력값이 누락되었습니다.", { field: missingField });
  if (!LOGIN_ID_PATTERN.test(data.loginId)) throw new AppError(400, "VALIDATION_ERROR", "아이디는 영문과 숫자 4~20자로 입력해주세요.", { field: "loginId" });
  if (!isValidPassword(data.password)) throw new AppError(400, "VALIDATION_ERROR", "비밀번호는 영문, 숫자, 특수문자 중 2가지 이상을 조합한 8~20자여야 합니다.", { field: "password" });
  if (data.password !== data.passwordConfirm) throw new AppError(400, "VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.", { field: "passwordConfirm" });
  if (!PHONE_PATTERN.test(data.phone)) throw new AppError(400, "VALIDATION_ERROR", "휴대전화 번호 형식을 확인해주세요.", { field: "phone" });
  if (data.email && !EMAIL_PATTERN.test(data.email)) throw new AppError(400, "VALIDATION_ERROR", "이메일 형식을 확인해주세요.", { field: "email" });
  if (!data.termsAgreed) throw new AppError(400, "VALIDATION_ERROR", "이용약관과 개인정보 처리방침에 동의해주세요.", { field: "termsAgreed" });
  return data;
}

/** 인증번호 발송 요청의 휴대전화 번호와 목적을 검증한다. */
export function validatePhoneSend(body = {}) {
  const data = { ...validatePhoneBase(body), name: text(body.name), loginId: text(body.loginId) };
  if ((data.purpose === "FIND_ID" || data.purpose === "RESET_PASSWORD") && !data.name) {
    throw new AppError(400, "VALIDATION_ERROR", "이름을 확인해주세요.", { field: "name" });
  }
  if (data.purpose === "RESET_PASSWORD" && !data.loginId) {
    throw new AppError(400, "VALIDATION_ERROR", "아이디를 확인해주세요.", { field: "loginId" });
  }
  return data;
}

/** 인증번호 확인 요청의 번호, 목적, 인증 식별자와 6자리 코드를 검증한다. */
export function validatePhoneVerify(body = {}) {
  const data = { ...validatePhoneBase(body), phoneVerificationId: text(body.phoneVerificationId), code: text(body.code) };
  if (!data.phoneVerificationId) throw new AppError(400, "VALIDATION_ERROR", "휴대전화 인증 식별자가 필요합니다.", { field: "phoneVerificationId" });
  if (!PHONE_CODE_PATTERN.test(data.code)) throw new AppError(400, "VALIDATION_ERROR", "인증번호 6자리를 입력해주세요.", { field: "code" });
  return data;
}

/** 인증 상태 조회 요청의 번호, 목적과 인증 식별자를 검증한다. */
export function validatePhoneStatus(query = {}) {
  const data = { ...validatePhoneBase(query), phoneVerificationId: text(query.phoneVerificationId) };
  if (!data.phoneVerificationId) throw new AppError(400, "VALIDATION_ERROR", "휴대전화 인증 식별자가 필요합니다.", { field: "phoneVerificationId" });
  return data;
}

/** 아이디 찾기 요청의 이름, 휴대전화 번호와 인증 식별자를 검증한다. */
export function validateFindLoginId(body = {}) {
  const data = { name: text(body.name), phone: normalizePhone(body.phone), phoneVerificationId: text(body.phoneVerificationId) };
  if (!data.name) throw new AppError(400, "VALIDATION_ERROR", "이름을 입력해주세요.", { field: "name" });
  if (!PHONE_PATTERN.test(data.phone)) throw new AppError(400, "VALIDATION_ERROR", "휴대전화 번호 형식을 확인해주세요.", { field: "phone" });
  if (!data.phoneVerificationId) throw new AppError(400, "VALIDATION_ERROR", "휴대전화 인증이 필요합니다.", { field: "phoneVerificationId" });
  return data;
}

/** 비밀번호 재설정 요청의 계정 정보, 새 비밀번호와 인증 식별자를 검증한다. */
export function validateResetPassword(body = {}) {
  const data = { loginId: text(body.loginId), name: text(body.name), phone: normalizePhone(body.phone), phoneVerificationId: text(body.phoneVerificationId), password: typeof body.password === "string" ? body.password : "", passwordConfirm: typeof body.passwordConfirm === "string" ? body.passwordConfirm : "" };
  const missingField = ["loginId", "name", "phone", "phoneVerificationId", "password", "passwordConfirm"].find((field) => !data[field]);
  if (missingField) throw new AppError(400, "VALIDATION_ERROR", "필수 입력값이 누락되었습니다.", { field: missingField });
  if (!PHONE_PATTERN.test(data.phone)) throw new AppError(400, "VALIDATION_ERROR", "휴대전화 번호 형식을 확인해주세요.", { field: "phone" });
  if (!isValidPassword(data.password)) throw new AppError(400, "VALIDATION_ERROR", "비밀번호는 영문, 숫자, 특수문자 중 2가지 이상을 조합한 8~20자여야 합니다.", { field: "password" });
  if (data.password !== data.passwordConfirm) throw new AppError(400, "VALIDATION_ERROR", "비밀번호가 일치하지 않습니다.", { field: "passwordConfirm" });
  return data;
}

/** 로그인 요청에 아이디와 비밀번호가 모두 포함됐는지 검증한다. */
export function validateLogin(body = {}) {
  const data = { loginId: text(body.loginId), password: typeof body.password === "string" ? body.password : "" };
  if (!data.loginId || !data.password) throw new AppError(400, "VALIDATION_ERROR", "아이디와 비밀번호를 입력해주세요.", { fields: ["loginId", "password"] });
  return data;
}

/** 아이디 중복 확인 query를 검증한다. */
export function validateLoginId(value) {
  const loginId = text(value);
  if (!LOGIN_ID_PATTERN.test(loginId)) throw new AppError(400, "VALIDATION_ERROR", "아이디는 영문과 숫자 4~20자로 입력해주세요.", { field: "loginId" });
  return loginId;
}
