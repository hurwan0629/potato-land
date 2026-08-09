import { http } from "./http";
import { toQueryString } from "./queryString";
export const usedApi={
  list:(params)=>http.get(`/used${toQueryString(params)}`),
  get:(listingIdx)=>http.get(`/used/${listingIdx}`),
  create:(formData)=>http.post("/used",formData),
  update:(listingIdx,formData)=>http.patch(`/used/${listingIdx}`,formData),
  remove:(listingIdx,body)=>http.delete(`/used/${listingIdx}`,body),
  favorite:(listingIdx)=>http.post(`/used/${listingIdx}/favorite`),
  unfavorite:(listingIdx)=>http.delete(`/used/${listingIdx}/favorite`),
};
