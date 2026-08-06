import { http } from "./http";
import { toQueryString } from "./queryString";
export const mypageApi={
  myListings:(params)=>http.get(`/mypage/me/listings${toQueryString(params)}`),
  myFavorites:(params)=>http.get(`/mypage/me/favorites${toQueryString(params)}`),
  myHistory:(params)=>http.get(`/mypage/me/history${toQueryString(params)}`),
  myReviews:(params)=>http.get(`/mypage/me/reviews${toQueryString(params)}`),
  userListings:(userIdx,params)=>http.get(`/mypage/${userIdx}/listings${toQueryString(params)}`),
};
