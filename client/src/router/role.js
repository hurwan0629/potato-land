const constRole = {
  GUEST: "guest",     // 비로그인 상태에서만 접근 가능 (로그인/랜딩/회원가입)
  LOGIN: "login",      // 로그인한 유저만 접근 가능
  ADMIN: "admin",      // 관리자만 접근 가능
  PUBLIC: "public",    // 로그인 여부 상관없이 누구나 접근 가능
};

export default constRole 