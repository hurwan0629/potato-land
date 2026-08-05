import { http } from "./http";

/**
 * docs/05. API와 이벤트/HTTP API 상세/08. 마이페이지.md 기준 경로
 *
 *  GET /mypage/me/listings    - 내 판매상품 (로그인 필요)
 *  GET /mypage/me/favorites   - 내 관심목록 (로그인 필요)
 *  GET /mypage/me/history     - 내 거래내역 (로그인 필요)
 *  GET /mypage/me/reviews     - 내가 받은 후기 (로그인 필요)
 *  GET /mypage/:userIdx/listings - 상대방 공개 판매상품
 *  GET /users/:userIdx/reviews   - 상대방이 받은 후기 (공개 프로필용, users 모듈)
 */

function toQuery(params = {}) {
  const usp = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    usp.set(key, value);
  });

  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export const mypageApi = {
  getMyListings: (params) => http.get(`/mypage/me/listings${toQuery(params)}`),
  getMyFavorites: (params) => http.get(`/mypage/me/favorites${toQuery(params)}`),
  getMyHistory: (params) => http.get(`/mypage/me/history${toQuery(params)}`),
  getMyReviews: (params) => http.get(`/mypage/me/reviews${toQuery(params)}`),
  getUserListings: (userIdx, params) => http.get(`/mypage/${userIdx}/listings${toQuery(params)}`),
  getUserReviews: (userIdx, params) => http.get(`/users/${userIdx}/reviews${toQuery(params)}`),
};
