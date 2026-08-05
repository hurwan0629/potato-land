/**
 * 인증 구현은 common/auth/accessToken.js 한 곳에서만 관리한다.
 * 기존 import 경로를 사용하는 모듈을 깨뜨리지 않기 위한 호환용 재수출 파일이다.
 */
export {
  authenticateAccessToken,
  getAccessTokenFromCookieHeader,
  optionalAuth,
  requireAuth,
  requireRole,
} from "../auth/accessToken.js";
