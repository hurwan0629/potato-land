import { http } from "./http";

function unwrap(response) {
  return response?.data ?? response;
}

export const chatApi = {
  list: ({ q = "", page = 1, limit = 7 } = {}) =>
    http.get(`/chats?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`).then(unwrap),
  create: (listingIdx) => http.post("/chats", { listingIdx }).then(unwrap),
  detail: (chatRoomIdx) => http.get(`/chats/${chatRoomIdx}`).then(unwrap),
  messages: (chatRoomIdx, { page = 1, limit = 30 } = {}) =>
    http.get(`/chats/${chatRoomIdx}/messages?page=${page}&limit=${limit}`).then(unwrap),
  uploadImages: (chatRoomIdx, files) => {
    const formData = new FormData();
    [...files].forEach((file) => formData.append("images", file));
    return http.post(`/chats/${chatRoomIdx}/messages/images`, formData).then(unwrap);
  },
  createPaymentRequest: ({ listingIdx, buyerIdx, amount, message }) =>
    http.post("/transactions/payment-requests", { listingIdx, buyerIdx, amount, message }).then(unwrap),
};
