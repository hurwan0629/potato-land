import { http } from "./http";
import { toQueryString } from "./queryString";
export const adminApi={
  dashboard:(params)=>http.get(`/admin/dashboard${toQueryString(params)}`),
  users:(params)=>http.get(`/admin/users${toQueryString(params)}`),user:(id)=>http.get(`/admin/users/${id}`),
  transactions:(id,params)=>http.get(`/admin/users/${id}/transactions${toQueryString(params)}`),
  reviews:(id,params)=>http.get(`/admin/users/${id}/reviews${toQueryString(params)}`),
  ban:(id,body)=>http.patch(`/admin/users/${id}/ban`,body),memo:(id,body)=>http.patch(`/admin/users/${id}/memo`,body),
  used:(params)=>http.get(`/admin/used${toQueryString(params)}`),deleteUsed:(id,body)=>http.delete(`/admin/used/${id}`,body),
  auctions:(params)=>http.get(`/admin/auctions${toQueryString(params)}`),winners:(params)=>http.get(`/admin/auctions/winners${toQueryString(params)}`),deleteAuction:(id,body)=>http.delete(`/admin/auctions/${id}`,body),
};
