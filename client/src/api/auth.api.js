const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080/api";

/** 인증 API를 쿠키 포함 방식으로 호출하고 실패 응답을 Error로 변환한다. */
async function authRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const result = await response.json().catch(() => ({ success: false, message: "서버 응답을 확인할 수 없습니다." }));
  if (!response.ok) {
    const error = new Error(result.message ?? "요청 처리에 실패했습니다.");
    error.code = result.code;
    error.details = result.details;
    throw error;
  }
  return result.data;
}

/** 아이디와 비밀번호로 로그인하고 사용자 요약 정보를 반환한다. */
export function login(payload) {
  return authRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

/** SMS 인증을 제외한 회원가입 정보를 서버에 저장한다. */
export function signup(payload) {
  return authRequest("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
}

/** 회원가입 아이디의 중복 여부를 서버에서 확인한다. */
export function checkLoginId(loginId) {
  return authRequest(`/auth/check-id?loginId=${encodeURIComponent(loginId)}`);
}

/** HttpOnly access cookie를 사용해 현재 로그인 사용자를 조회한다. */
export function getMe() {
  return authRequest("/auth/me");
}
