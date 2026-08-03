import { useEffect, useState } from "react";

import { getMe } from "../api/auth.api.js";
import { navigate } from "../common/navigation.js";
import { Brand } from "./Brand.jsx";

/** 메인 또는 인증 화면에 맞는 공통 상단 영역을 표시한다. */
export function Header({ authPage = false }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!authPage) getMe().then(setUser).catch(() => setUser(null));
  }, [authPage]);

  return (
    <header className="site-header">
      <Brand />
      {!authPage && <><button className="menu-button inactive" type="button" aria-label="전체 메뉴">☰</button><nav className="main-nav" aria-label="주요 메뉴">{["중고거래", "상품 등록", "경매", "채팅"].map((item) => <button className="nav-link inactive" type="button" key={item}>{item}</button>)}</nav><div className="header-actions">{user ? <span className="user-greeting">{user.nickname}님</span> : <button className="login-link" type="button" onClick={() => navigate("/login")}>로그인</button>}<button className="search-icon inactive" type="button" aria-label="검색">⌕</button></div></>}
    </header>
  );
}
