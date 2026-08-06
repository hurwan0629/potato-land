import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import constRole from "./role";
import USER_ROLE from "../constants/userRole";

/**
 * 역할 기반 접근 제어 wrapper
 *
 * 사용 방식이 두 가지입니다 (router.jsx 참고):
 * 1) <Auth role={constRole.LOGIN}><Home /></Auth>  → children 렌더링
 * 2) <Auth role={constRole.LOGIN} /> 를 부모 라우트로 두고
 *    children 라우트들이 <Outlet />을 통해 렌더링
 *
 * role 종류 (role.js):
 * - GUEST : 비로그인 상태에서만 접근 가능 (로그인 상태면 / 로)
 * - LOGIN : 로그인한 유저만 접근 가능 (아니면 / 로)
 * - ADMIN : 관리자만 접근 가능 (아니면 / 로)
 * - PUBLIC: 누구나 접근 가능
 */
export default function Auth({ role, children }) {
  const { user, isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  // /auth/me 로 세션(쿠키) 확인 중 - 아직 로그인 여부를 모르는 상태라
  // 여기서 리다이렉트해버리면 새로고침할 때마다 로그인 화면으로 잠깐
  // 튕기는 깜빡임이 생김. 확인 끝날 때까지 대기.
  if (isLoading) return null; // TODO: 필요하면 스피너 컴포넌트로 교체

  const isAdmin = user?.role === USER_ROLE.ADMIN;

  switch (role) {
    case constRole.GUEST:
      if (isLoggedIn) return <Navigate to="/" replace />;
      break;

    case constRole.LOGIN:
      if (!isLoggedIn) {
        return <Navigate to="/" replace state={{ from: location }} />;
      }
      break;

    case constRole.ADMIN:
      if (!isLoggedIn) {
        return <Navigate to="/" replace state={{ from: location }} />;
      }
      if (!isAdmin) return <Navigate to="/" replace />;
      break;

    case constRole.PUBLIC:
    default:
      break;
  }

  return children ?? <Outlet />;
}
