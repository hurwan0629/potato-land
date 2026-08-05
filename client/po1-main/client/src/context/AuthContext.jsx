import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi } from "../api/authApi";
import { setUnauthorizedHandler } from "../api/http";

/**
 * 쿠키 기반 인증 Context
 * ------------------------------------------------------------------
 * 세션 쿠키가 HttpOnly라는 전제라 프론트 JS는 쿠키 값을 직접 읽지도,
 * 저장하지도 않습니다. "로그인 여부"의 진짜 출처는 서버이고,
 * 프론트는 앱이 처음 뜰 때 /auth/me 를 호출해서 현재 세션이 유효한지
 * 물어보고, 그 결과만 메모리(state)에 잠깐 들고 있는 구조입니다.
 *
 * → 새로고침하면 user state는 초기화되지만, 쿠키 자체는 브라우저에
 *   남아있으니 checkSession()이 다시 /auth/me 로 로그인 상태를 복원합니다.
 *
 * user: null (비로그인) | { id, nickname, role: "USER" | "ADMIN" }
 * isLoading: 최초 세션 확인이 끝나기 전까지 true
 *            (Auth.jsx 가드가 이 값을 보고 리다이렉트를 잠깐 보류함)
 *
 * ------------------------------------------------------------------
 * [개발 편의용] 상시 로그인 (mock, API 호출 없음)
 * .env 에 VITE_DEV_MOCK_LOGIN=true 로 켜두면, 백엔드에 아예 요청을
 * 보내지 않고 앱이 뜨자마자 곧바로 로그인된 상태로 시작합니다.
 * - 백엔드/Redis가 안 떠 있어도 프론트 화면 작업이 가능하다는 게 목적.
 * - 그 대신 이 상태는 진짜 세션이 아니라서, 로그아웃 버튼을 눌러도
 *   서버에 아무 요청이 안 가고 그냥 다시 mock 유저로 돌아옵니다.
 *   (진짜 로그인/로그아웃 흐름을 테스트하려면 이 옵션을 꺼야 함)
 * - import.meta.env.DEV 체크가 같이 걸려있어서 프로덕션 빌드에서는
 *   이 값이 true여도 절대 실행되지 않습니다.
 */
const DEV_MOCK_LOGIN =
  import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_LOGIN === "true";

const DEV_MOCK_USER = {
  id: import.meta.env.VITE_DEV_MOCK_USER_ID ?? "1",
  nickname: import.meta.env.VITE_DEV_MOCK_NICKNAME ?? "테스트유저",
  role: import.meta.env.VITE_DEV_MOCK_ROLE ?? "USER",
};
// =========================================================================
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    // mock 모드면 서버에 물어보지도 않고 바로 로그인된 상태로 시작
    if (DEV_MOCK_LOGIN) {
      setUser(DEV_MOCK_USER)
      setIsLoading(false)
      console.info("[dev] mock 로그인 활성화 (API 호출 없음):", DEV_MOCK_USER);
      return
    }

    try {
      const data = await authApi.me()
      setUser(data.user)
    } catch {
      // 401 등 - 세션 없음/만료. 에러로 취급하지 않고 비로그인 상태로 처리.
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, []);

  // access token 만료 → http.js가 자동으로 refresh 시도 → 그마저 실패하면
  // (= refresh token도 만료됨) 여기서 로그인 상태를 초기화.
  // API 응답 코드 안에서 흩어져 처리하지 않고 한 곳(Context)에서만 관리하기 위해 콜백으로 위임.
  useEffect(() => {
    if (DEV_MOCK_LOGIN) return; // mock 모드에선 실제 401 흐름 자체가 없음
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  // 앱 최초 진입 시 딱 한 번, 쿠키로 로그인 상태 복원 시도
  // (마운트 시 외부 시스템=서버에서 데이터를 가져오는 표준 패턴)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkSession();
  }, [checkSession])

  const login = useCallback(async ({ id, password }) => {
    if (DEV_MOCK_LOGIN) {
      setUser(DEV_MOCK_USER)
      return { ok: true }
    }

    if (!id || !password) {
      return { ok: false, message: "아이디와 비밀번호를 입력해주세요." }
    }
    try {
      const data = await authApi.login({ id, password })
      setUser(data.user)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error.message ?? "로그인에 실패했습니다." }
    }
  }, [])

  const logout = useCallback(async () => {
    if (DEV_MOCK_LOGIN) {
      // mock 모드에서는 서버에 요청 자체를 안 보냄
      setUser(DEV_MOCK_USER)
      return
    }

    try {
      await authApi.logout()
    } finally {
      // 서버 요청이 실패하더라도 화면상으로는 로그아웃 처리
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx
}
 