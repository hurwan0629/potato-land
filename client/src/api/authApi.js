import { http } from "./http";

/** 공통 API 성공 응답에서 실제 data 객체만 반환한다. */
function unwrap(response) { return response.data; }

export const authApi = {
  /** 아이디와 비밀번호를 전달해 HttpOnly 인증 쿠키를 발급받는다. */
  login: async ({ loginId, password, rememberLoginId }) => unwrap(await http.post("/auth/login", { loginId, password, rememberLoginId })),
  /** 휴대전화로 회원가입 인증번호 발송을 요청한다. */
  sendPhoneCode: async (phone, purpose = "SIGNUP", account = {}) => unwrap(await http.post("/auth/phone/send", { phone, purpose, ...account })),
  /** 사용자가 입력한 인증번호가 서버의 발송 정보와 일치하는지 확인한다. */
  verifyPhoneCode: async ({ phone, phoneVerificationId, code, purpose = "SIGNUP" }) => unwrap(await http.post("/auth/phone/verify", { phone, purpose, phoneVerificationId, code })),
  /** 휴대전화 본인인증과 이름이 일치하는 계정의 아이디를 조회한다. */
  findLoginId: async (payload) => unwrap(await http.post("/auth/find-id", payload)),
  /** 휴대전화 본인인증이 완료된 계정의 비밀번호를 새 값으로 변경한다. */
  resetPassword: async (payload) => unwrap(await http.post("/auth/password/reset", payload)),
  /** 인증 완료 정보가 포함된 회원 정보를 전달해 신규 사용자를 생성한다. */
  signup: async (payload) => unwrap(await http.post("/auth/signup", payload)),
  /** 입력한 아이디가 회원가입에 사용 가능한지 확인한다. */
  checkLoginId: async (loginId) => unwrap(await http.get(`/auth/check-id?loginId=${encodeURIComponent(loginId)}`)),
  /** refresh 세션을 제거하고 인증 쿠키를 만료한다. */
  logout: async () => unwrap(await http.post("/auth/refresh/logout")),
  /** access cookie를 기준으로 현재 로그인 사용자를 조회한다. */
  me: async () => unwrap(await http.get("/auth/me")),
  /** refresh cookie 회전으로 access/refresh 쿠키를 재발급한다. */
  refresh: async () => unwrap(await http.post("/auth/refresh")),
};
