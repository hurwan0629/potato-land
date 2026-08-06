import { createFormData, http, toQueryString, unwrap } from "./http";

async function data(promise) {
  return unwrap(await promise);
}

export const authApi = {
  login(payload) {
    return data(http.post("/auth/login", payload));
  },

  logout() {
    return data(http.post("/auth/refresh/logout"));
  },

  me() {
    return data(http.get("/auth/me"));
  },

  refresh() {
    return data(http.post("/auth/refresh"));
  },

  checkLoginId(loginId) {
    return data(http.get(`/auth/check-id${toQueryString({ loginId })}`));
  },

  sendPhoneCode({ phone, purpose = "SIGNUP", ...account }) {
    return data(http.post("/auth/phone/send", { phone, purpose, ...account }));
  },

  verifyPhoneCode(payload) {
    return data(http.post("/auth/phone/verify", payload));
  },

  signup(payload) {
    return data(http.post("/auth/signup", payload));
  },

  findLoginId(payload) {
    return data(http.post("/auth/find-id", payload));
  },

  resetPassword(payload) {
    return data(http.post("/auth/password/reset", payload));
  },

  sessions() {
    return data(http.get("/auth/sessions"));
  },

  deleteSession(sessionId) {
    return data(http.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`));
  },

  logoutAll() {
    return data(http.post("/auth/logout-all"));
  },
};

export const mainApi = {
  get(limit = 4) {
    return data(http.get(`/main${toQueryString({ limit })}`));
  },

  categories() {
    return data(http.get("/categories"));
  },
};

export const usedApi = {
  list(parameters = {}) {
    return data(http.get(`/used${toQueryString(parameters)}`));
  },

  get(listingIdx) {
    return data(http.get(`/used/${listingIdx}`));
  },

  create(values, files) {
    return data(http.post("/used", createFormData(values, files)));
  },

  update(listingIdx, values, files) {
    return data(http.patch(`/used/${listingIdx}`, createFormData(values, files)));
  },

  remove(listingIdx, deleteReason) {
    return data(http.delete(`/used/${listingIdx}`, { deleteReason }));
  },

  favorite(listingIdx) {
    return data(http.post(`/used/${listingIdx}/favorite`));
  },

  unfavorite(listingIdx) {
    return data(http.delete(`/used/${listingIdx}/favorite`));
  },
};

export const auctionsApi = {
  list(parameters = {}) {
    return data(http.get(`/auctions${toQueryString(parameters)}`));
  },

  get(listingIdx) {
    return data(http.get(`/auctions/${listingIdx}`));
  },

  create(values, files) {
    return data(http.post("/auctions", createFormData(values, files)));
  },

  update(listingIdx, values, files) {
    return data(http.patch(`/auctions/${listingIdx}`, createFormData(values, files)));
  },

  remove(listingIdx, deleteReason) {
    return data(http.delete(`/auctions/${listingIdx}`, { deleteReason }));
  },

  bid(listingIdx, bidAmount) {
    return data(http.post(`/auctions/${listingIdx}/bids`, { bidAmount }));
  },

  bids(listingIdx, parameters = {}) {
    return data(http.get(`/auctions/${listingIdx}/bids${toQueryString(parameters)}`));
  },

  favorite(listingIdx) {
    return data(http.post(`/auctions/${listingIdx}/favorite`));
  },

  unfavorite(listingIdx) {
    return data(http.delete(`/auctions/${listingIdx}/favorite`));
  },
};

export const chatApi = {
  list(parameters = {}) {
    return data(http.get(`/chats${toQueryString({ page: 1, limit: 20, ...parameters })}`));
  },

  create(listingIdx) {
    return data(http.post("/chats", { listingIdx }));
  },

  detail(chatRoomIdx) {
    return data(http.get(`/chats/${chatRoomIdx}`));
  },

  messages(chatRoomIdx, parameters = {}) {
    return data(http.get(
      `/chats/${chatRoomIdx}/messages${toQueryString({ page: 1, limit: 50, ...parameters })}`,
    ));
  },

  uploadImages(chatRoomIdx, files) {
    const formData = new FormData();
    [...files].forEach((file) => formData.append("images", file));
    return data(http.post(`/chats/${chatRoomIdx}/messages/images`, formData));
  },
};

export const transactionsApi = {
  createPaymentRequest(payload) {
    return data(http.post("/transactions/payment-requests", payload));
  },

  get(transactionIdx) {
    return data(http.get(`/transactions/${transactionIdx}`));
  },

  complete(transactionIdx) {
    return data(http.patch(`/transactions/${transactionIdx}/complete`, { confirm: true }));
  },

  cancel(transactionIdx, reason) {
    return data(http.patch(`/transactions/${transactionIdx}/cancel`, { reason }));
  },
};

export const reviewsApi = {
  tags() {
    return data(http.get("/reviews/tags"));
  },

  create(payload) {
    return data(http.post("/reviews", payload));
  },

  received(userIdx, parameters = {}) {
    return data(http.get(`/users/${userIdx}/reviews${toQueryString(parameters)}`));
  },
};

export const usersApi = {
  me() {
    return data(http.get("/users/me"));
  },

  profile(userIdx) {
    return data(http.get(`/users/${userIdx}/profile`));
  },

  updatePublicProfile({ nickname, bio, image }) {
    const formData = new FormData();
    formData.append("nickname", nickname ?? "");
    formData.append("bio", bio ?? "");
    if (image) {
      formData.append("image", image);
    }
    return data(http.patch("/users/me/profile", formData));
  },

  verifyPassword(password) {
    return data(http.post("/users/me/verify-password", { password }));
  },

  update(payload) {
    return data(http.patch("/users/me", payload));
  },

  withdraw(editToken) {
    return data(http.delete("/users/me", { editToken }));
  },
};

export const mypageApi = {
  myListings(parameters = {}) {
    return data(http.get(`/mypage/me/listings${toQueryString(parameters)}`));
  },

  favorites(parameters = {}) {
    return data(http.get(`/mypage/me/favorites${toQueryString(parameters)}`));
  },

  history(parameters = {}) {
    return data(http.get(`/mypage/me/history${toQueryString(parameters)}`));
  },

  reviews(parameters = {}) {
    return data(http.get(`/mypage/me/reviews${toQueryString(parameters)}`));
  },

  userListings(userIdx, parameters = {}) {
    return data(http.get(`/mypage/${userIdx}/listings${toQueryString(parameters)}`));
  },
};

export const notificationsApi = {
  list(parameters = {}) {
    return data(http.get(`/notifications${toQueryString({ page: 1, limit: 30, ...parameters })}`));
  },

  read(notificationIdx) {
    return data(http.patch(`/notifications/${notificationIdx}/read`));
  },

  readAll() {
    return data(http.patch("/notifications/read-all"));
  },

  unreadCount() {
    return data(http.get("/notifications/unread-count"));
  },
};

export const adminApi = {
  dashboard(parameters = {}) {
    return data(http.get(`/admin/dashboard${toQueryString(parameters)}`));
  },

  users(parameters = {}) {
    return data(http.get(`/admin/users${toQueryString(parameters)}`));
  },

  user(userIdx) {
    return data(http.get(`/admin/users/${userIdx}`));
  },

  userTransactions(userIdx, parameters = {}) {
    return data(http.get(`/admin/users/${userIdx}/transactions${toQueryString(parameters)}`));
  },

  userReviews(userIdx, parameters = {}) {
    return data(http.get(`/admin/users/${userIdx}/reviews${toQueryString(parameters)}`));
  },

  banUser(userIdx, reason) {
    return data(http.patch(`/admin/users/${userIdx}/ban`, { reason }));
  },

  updateMemo(userIdx, memo) {
    return data(http.patch(`/admin/users/${userIdx}/memo`, { memo }));
  },

  used(parameters = {}) {
    return data(http.get(`/admin/used${toQueryString(parameters)}`));
  },

  removeUsed(listingIdx, deleteReason) {
    return data(http.delete(`/admin/used/${listingIdx}`, { deleteReason }));
  },

  auctions(parameters = {}) {
    return data(http.get(`/admin/auctions${toQueryString(parameters)}`));
  },

  removeAuction(listingIdx, deleteReason) {
    return data(http.delete(`/admin/auctions/${listingIdx}`, { deleteReason }));
  },

  winners(parameters = {}) {
    return data(http.get(`/admin/auctions/winners${toQueryString(parameters)}`));
  },
};
