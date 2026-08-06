import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { Menu, Search, Heart, Bell, User, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import USER_ROLE from "../../constants/userRole";
import Button from "../button/Button";
import "./Header.css";

// 일반 유저 헤더 네비게이션
const USER_NAV_ITEMS = [
  { to: "/search", label: "중고거래" },
  { to: "/products/register", label: "상품 등록" },
  { to: "/auction", label: "경매" },
  { to: "/chat", label: "채팅" },
];

// 관리자 헤더 네비게이션
// TODO: /admin 하위에 회원/경매/중고거래 관리 라우트가 아직 안 생겨서 임시로 /admin 하나로 연결
const ADMIN_NAV_ITEMS = [
  { to: "/admin", label: "회원관리" },
  { to: "/admin", label: "경매관리" },
  { to: "/admin", label: "중고거래 관리" },
];

/** 로그인·권한·현재 경로에 맞는 최신 공통 헤더를 표시한다. */
export default function Header() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = user?.role === USER_ROLE.ADMIN;

  // 로그인 여부 상관없이 첫 화면(Home)은 항상 "/" 하나.
  // 관리자 화면은 별도 메인 화면 개념이 없어서 항상 작은 로고.
  const isMainScreen = !isAdmin && location.pathname === "/";

  const navItems = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  /** 서버 세션을 종료하고 메인 화면으로 이동한다. */
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="header">
      <div className="header-left">
        <NavLink
          to="/"
          className={`header-logo ${isMainScreen ? "is-main" : "is-sub"}`}
        >
          {isMainScreen && <span className="header-logo-mascot">🥔</span>}
          감자 나라
        </NavLink>

        {!isAdmin && (
          <button
            type="button"
            className="header-hamburger"
            aria-label="카테고리 메뉴"
            // TODO: 카테고리 드롭다운/사이드 메뉴 실제 내용 연결
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <Menu size={22} />
          </button>
        )}

        <nav className="header-nav">
          {navItems.map((item, index) => (
            <NavLink
              key={`${item.to}-${index}`}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "header-nav-link active" : "header-nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="header-actions">
        {isLoggedIn ? (
          <>
            <span className="header-nickname">
              {isAdmin ? "관리자" : user.nickname}
            </span>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="마이페이지"
              onClick={() => navigate(`/mypage/${user.userIdx}`)}
            >
              <User size={20} />
            </button>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="로그아웃"
              onClick={handleLogout}
            >
              <X size={20} />
            </button>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="찜한 상품"
              // TODO: 찜 목록 페이지 생기면 연결
            >
              <Heart size={20} />
            </button>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="알림"
              // TODO: 알림 드롭다운/페이지 생기면 연결
            >
              <Bell size={20} />
            </button>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="검색"
              onClick={() => navigate("/search")}
            >
              <Search size={20} />
            </button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
              로그인
            </Button>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="검색"
              onClick={() => navigate("/search")}
            >
              <Search size={20} />
            </button>
          </>
        )}
      </div>

      {isMenuOpen && (
        <MegaMenu />
      )}
    </header>
  );
}

/** Figma 상단바 시안의 중고거래·등록·경매·채팅 메뉴를 펼쳐 보여준다. */
function MegaMenu() {
  const groups = [
    { title: "중고거래", items: ["중고거래 둘러보기", "인기 상품", "카테고리 별 상품"] },
    { title: "상품등록", items: ["상품 등록", "판매 관리"] },
    { title: "경매", items: ["경매 둘러보기", "마감 임박", "낙찰 결과"] },
    { title: "채팅", items: ["채팅 바로가기"] },
  ];
  return <div className="header-mega-menu">{groups.map((group) => <section key={group.title}><h3>{group.title}</h3>{group.items.map((item) => <p key={item}>• {item}</p>)}</section>)}<div className="header-menu-mascot" aria-hidden="true">🛒<span>🥔</span></div></div>;
}
