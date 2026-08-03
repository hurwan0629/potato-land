const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * 공용 API 클라이언트
 * ------------------------------------------------------------------
 * 쿠키 기반 인증(HttpOnly) + JWT 전제:
 *  - access token: 수명 짧음, HttpOnly 쿠키에 담겨 매 요청마다 자동 전송
 *  - refresh token: 마찬가지로 HttpOnly 쿠키, /auth/refresh 요청에만 사용됨
 *
 * 그래서 이 클라이언트가 하는 일:
 *  1) credentials: "include" 고정 → 쿠키가 항상 실려가게
 *  2) 401 받으면 → /auth/refresh 한 번 시도해서 access token 재발급 →
 *     성공하면 원래 요청 자동 재시도, 실패하면 onUnauthorized 콜백 실행
 *     (AuthContext가 여기 등록해서 user 상태를 비로그인으로 초기화함)
 *
 * 백엔드 쪽 전제:
 *   Access-Control-Allow-Credentials: true
 *   Access-Control-Allow-Origin: <정확한 프론트 origin, * 불가>
 *   쿠키는 SameSite=None; Secure (배포) 또는 SameSite=Lax (로컬 http)
 */

let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

// refresh가 동시에 여러 번 불리는 것 방지 (여러 요청이 동시에 401 나는 경우 대비)
let refreshPromise = null
function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = rawRequest("/auth/refresh", { method: "POST" }).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// 실제 fetch 호출 (재시도/리프레시 로직 없이 순수 요청만)
async function rawRequest(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message ?? `요청에 실패했습니다. (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error
  }

  return data
}

// 401 자동 리프레시-후-재시도가 적용된 요청. 실제로 호출되는 진입점.
async function request(path, options = {}, { _retried = false } = {}) {
  const isAuthEndpoint = path === "/auth/refresh" || path === "/auth/login";

  try {
    return await rawRequest(path, options); 
  } catch (error) {
    // access token 만료로 401이 난 경우만 리프레시 시도.
    // 로그인/리프레시 요청 자체에서 난 401은 그대로 실패 처리 (무한루프 방지).
    if (error.status === 401 && !isAuthEndpoint && !_retried) {
      try {
        await refreshAccessToken();
        return await request(path, options, { _retried: true });
      } catch (refreshError) {
        onUnauthorized?.();
        throw refreshError;
      }
    }
    throw error;
  }
}

export const http = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
