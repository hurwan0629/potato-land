import { http } from "./http";

/** 공통 성공 응답에서 실제 data 객체만 반환한다. */
function unwrap(response) { return response.data; }

export const usersApi = {
  /** 현재 비밀번호를 확인하고 회원정보 수정용 단기 토큰을 발급받는다. */
  verifyPassword: async (password) => unwrap(await http.post("/users/me/verify-password", { password })),
  /** 수정 토큰과 검증된 회원정보를 서버에 저장한다. */
  updateMe: async (payload) => unwrap(await http.patch("/users/me", payload)),
  /** 별도 추가 정보 없이 확인된 현재 계정을 탈퇴 처리한다. */
  withdrawMe: async (editToken) => unwrap(await http.delete("/users/me", { editToken })),
};
