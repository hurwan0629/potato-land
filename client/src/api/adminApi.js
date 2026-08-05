import { http } from "./http";

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, value);
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
};

export const adminApi = {
  getDashboard: (params) => http.get(`/admin/dashboard${toQueryString(params)}`),

  listUsers: (params) => http.get(`/admin/users${toQueryString(params)}`),
  getUser: (userIdx) => http.get(`/admin/users/${userIdx}`),
  getUserTransactions: (userIdx, params) =>
    http.get(`/admin/users/${userIdx}/transactions${toQueryString(params)}`),
  getUserReviews: (userIdx, params) =>
    http.get(`/admin/users/${userIdx}/reviews${toQueryString(params)}`),
  banUser: (userIdx, body) => http.patch(`/admin/users/${userIdx}/ban`, body),
  updateUserMemo: (userIdx, body) => http.patch(`/admin/users/${userIdx}/memo`, body),

  listUsed: (params) => http.get(`/admin/used${toQueryString(params)}`),
  deleteUsed: (listingIdx, body) => http.delete(`/admin/used/${listingIdx}`, body),

  listAuctions: (params) => http.get(`/admin/auctions${toQueryString(params)}`),
  listAuctionWinners: (params) => http.get(`/admin/auctions/winners${toQueryString(params)}`),
  deleteAuction: (listingIdx, body) => http.delete(`/admin/auctions/${listingIdx}`, body),
};
