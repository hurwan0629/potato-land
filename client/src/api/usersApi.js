import { http } from "./http";

export const usersApi = {
  getProfile: (userIdx) => http.get(`/users/${userIdx}/profile`),
};
