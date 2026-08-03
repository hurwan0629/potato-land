import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

import { authApi } from "../api/authApi";
import { setUnauthorizedHandler } from "../api/http";


// =====================================================
// 개발용 Mock 로그인
// =====================================================

const DEV_MOCK_LOGIN =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_MOCK_LOGIN === "true";

const DEV_MOCK_USER = {
  id: import.meta.env.VITE_DEV_MOCK_USER_ID ?? "1",
  nickname:
    import.meta.env.VITE_DEV_MOCK_NICKNAME ?? "테스트유저",
  role:
    import.meta.env.VITE_DEV_MOCK_ROLE ?? "USER",
};


// =====================================================
// Context
// =====================================================

const AuthContext = createContext(null);


export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  const [isLoading, setIsLoading] =
    useState(true)


  // ===================================================
  // 현재 로그인 상태 확인
  // ===================================================

  const checkSession = useCallback(async () => {

    // 개발용 Mock
    if (DEV_MOCK_LOGIN) {

      setUser(DEV_MOCK_USER)
      setIsLoading(false)

      return
    }


    try {

      // Cookie는 http.js가 자동으로 전송
      const data =
        await authApi.me()

      setUser(data.user)

    } catch {

      // 로그인 상태가 아니면 null
      setUser(null)

    } finally {

      setIsLoading(false)
    }

  }, [])


  // ===================================================
  // Access Token / Refresh Token 인증 실패 처리
  // ===================================================

  useEffect(() => {

    if (DEV_MOCK_LOGIN) {
      return;
    }


    // http.js에서 Refresh까지 실패하면
    // 이 함수가 실행됨
    setUnauthorizedHandler(() => {
      setUser(null)
    })


    // AuthProvider가 제거될 때 해제
    return () => {
      setUnauthorizedHandler(null);
    }

  }, [])


  // ===================================================
  // 앱 시작 시 로그인 상태 확인
  // ===================================================

  useEffect(() => {

    checkSession();

  }, [checkSession])


  // ===================================================
  // 로그인
  // ===================================================

  const login = useCallback(
    async ({ id, password }) => {

      // 개발용 Mock 로그인
      if (DEV_MOCK_LOGIN) {

        setUser(DEV_MOCK_USER)

        return {
          ok: true,
        }
      }


      // 입력값 확인
      if (!id || !password) {

        return {
          ok: false,
          message:
            "아이디와 비밀번호를 입력해주세요.",
        }
      }


      try {

        // 백엔드 로그인
        const data =
          await authApi.login({
            id,
            password,
          })


        // 서버가 반환한 user 저장
        setUser(data.user)


        return {
          ok: true,
        }

      } catch (error) {

        return {
          ok: false,
          message:
            error.message ??
            "로그인에 실패했습니다.",
        }
      }
    },
    []
  )


  // ===================================================
  // 로그아웃
  // ===================================================

  const logout = useCallback(
    async () => {

      // Mock 로그인
      if (DEV_MOCK_LOGIN) {

        setUser(DEV_MOCK_USER);

        return
      }


      try {

        // 서버에서 Cookie 삭제
        await authApi.logout();

      } finally {

        // 화면에서도 로그아웃
        setUser(null)
      }
    },
    []
  )


  // ===================================================
  // Context 제공
  // ===================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


// =====================================================
// useAuth
// =====================================================

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {

  const ctx =
    useContext(AuthContext)


  if (!ctx) {

    throw new Error(
      "useAuth는 AuthProvider 내부에서만 사용할 수 있습니다."
    )
  }


  return ctx
}