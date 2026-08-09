import { http } from "./http";
import { toQueryString } from "./queryString";
export const reviewsApi={tags:()=>http.get("/reviews/tags"),create:(body)=>http.post("/reviews",body),userReviews:(userIdx,params)=>http.get(`/users/${userIdx}/reviews${toQueryString(params)}`)};
