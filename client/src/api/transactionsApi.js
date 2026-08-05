import { http } from "./http";

function unwrap(response) {
  return response?.data ?? response;
}

export const transactionsApi = {
  detail: (transactionIdx) => http.get(`/transactions/${transactionIdx}`).then(unwrap),
  complete: (transactionIdx) => http.patch(`/transactions/${transactionIdx}/complete`, { confirm: true }).then(unwrap),
  cancel: (transactionIdx) => http.patch(`/transactions/${transactionIdx}/cancel`, {}).then(unwrap),
};
