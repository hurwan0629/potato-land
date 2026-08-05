import { http } from "./http";
import { toQueryString } from "./queryString";
export const mainApi={getMain:(params)=>http.get(`/main${toQueryString(params)}`),getCategories:()=>http.get("/categories")};
