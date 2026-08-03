import { AppError } from "../../common/errors/AppError.js";

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9]{4,20}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;
const PHONE_PATTERN = /^01[016789]\d{7,8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 문자열 입력값의 양쪽 공백을 제거한다. */
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** 회원가입 요청을 정규화하고 필수값·형식·약관 동의를 검증한다. */
export function validateSignup(body = {}) {
  const data = {
    name: text(body.name),
    nickname: text(body.nickname),
    loginId: text(body.loginId),
    password: typeof body.password === "string" ? body.password : "",
    passwordConfirm: typeof body.passwordConfirm === "string" ? body.passwordConfirm : "",
    phone: text(body.phone).replaceAll("-", ""),
    email: text(body.email) || null,
    termsAgreed: body.termsAgreed === true,
  };

  const requiredFields = ["name", "nickname", "loginId", "password", "passwordConfirm", "phone"];
  const missingField = requiredFields.find((field) => !data[field]);
  if (missingField) throw new AppError(400, "VALIDATION_ERROR", "필수 입력값이 누락되었습니다.", { field: missingField });
  if (!LOGIN_ID_PATTERN.test(data.loginId)) throw new AppError(400, "VALIDATION_ERROR", "아이디는 영문과 숫자 4~20자로 입력해주세요.", { field: "loginId" });
  if (!PASSWORD_PATTERN.test(data.password)) throw new AppError(400, "VALIDATION_ERROR", "비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.", { field: "password" });
  if (data.password !== data.passwordConfirm) throw new AppError(400, "VALIDATION_ERROR", "비밀번호와 비밀번호 확인이 일치하지 않습니다.", { field: "passwordConfirm" });
  if (!PHONE_PATTERN.test(data.phone)) throw new AppError(400, "VALIDATION_ERROR", "전화번호 형식을 확인해주세요.", { field: "phone" });
  if (data.email && !EMAIL_PATTERN.test(data.email)) throw new AppError(400, "VALIDATION_ERROR", "이메일 형식을 확인해주세요.", { field: "email" });
  if (!data.termsAgreed) throw new AppError(400, "VALIDATION_ERROR", "이용약관과 개인정보 처리방침에 동의해주세요.", { field: "termsAgreed" });
  return data;
}

/** 로그인 요청에 아이디와 비밀번호가 모두 포함됐는지 검증한다. */
export function validateLogin(body = {}) {
  const data = { loginId: text(body.loginId), password: typeof body.password === "string" ? body.password : "" };
  if (!data.loginId || !data.password) throw new AppError(400, "VALIDATION_ERROR", "아이디와 비밀번호를 입력해주세요.", { fields: ["loginId", "password"] });
  return data;
}

/** 아이디 중복 확인용 query를 검증한다. */
export function validateLoginId(value) {
  const loginId = text(value);
  if (!LOGIN_ID_PATTERN.test(loginId)) throw new AppError(400, "VALIDATION_ERROR", "아이디는 영문과 숫자 4~20자로 입력해주세요.", { field: "loginId" });
  return loginId;
}
