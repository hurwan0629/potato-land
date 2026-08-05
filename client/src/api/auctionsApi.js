import { http } from "./http";

/** 공통 API 성공 응답에서 실제 데이터만 꺼낸다. */
function unwrap(response) {
  return response.data;
}

/** 검색 조건을 빈 값 없이 쿼리 문자열로 변환한다. */
function toQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const auctionsApi = {
  /** 검색·정렬·페이지 조건으로 경매 목록을 조회한다. */
  list: async (params) => unwrap(await http.get(`/auctions${toQueryString(params)}`)),
  /** 경매 상품 한 건의 상세 정보를 조회한다. */
  detail: async (listingIdx) => unwrap(await http.get(`/auctions/${listingIdx}`)),
  /** 이미지가 포함된 새 경매 상품을 등록한다. */
  create: async (formData) => unwrap(await http.post("/auctions", formData)),
  /** 판매자가 등록한 경매 상품 정보를 수정한다. */
  update: async (listingIdx, formData) => unwrap(await http.patch(`/auctions/${listingIdx}`, formData)),
  /** 판매자 또는 관리자가 경매 상품을 소프트 삭제한다. */
  remove: async (listingIdx, deleteReason) => unwrap(await http.delete(`/auctions/${listingIdx}`, { deleteReason })),
};
