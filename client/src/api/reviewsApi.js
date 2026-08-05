import { http } from "./http";

export const reviewsApi = {
  create: (body) => http.post("/reviews", body),
};
