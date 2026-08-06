import { http } from "./http";

/**
 * 백엔드 스펙이 아직 확정 전이라 우선 아래 경로로 가정해서 구현했습니다.
 * 실제 API 경로가 다르면 이 파일만 고치면 됩니다 (다른 코드는 안 건드려도 됨).
 *
 *  POST /auth/login   { id, password } → { user: { id, nickname, role } }
 *                                        + access/refresh token을 HttpOnly 쿠키로 발급
 *  POST /auth/logout  (body 없음)       → 서버가 두 쿠키 모두 만료 처리
 *  GET  /auth/me      (쿠키만으로 인증) → { user } 또는 401
 *  POST /auth/refresh (refresh 쿠키만으로 인증)
 *                                      → access token 재발급(쿠키로), 필요시 { user }
 *
 * refresh는 http.js가 401 발생 시 내부적으로 자동 호출하므 로,
 * 화면 코드에서 authApi.refresh()를 직접 부를 일은 거의 없습니다.
 */
export const authApi = {
  login: ({ id, password }) => http.post("/auth/login", { id, password }),
  logout: () => http.post("/auth/logout"),
  me: () => http.get("/auth/me"),
  refresh: () => http.post("/auth/refresh"),
};
