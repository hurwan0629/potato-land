import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { Menu, Search, Heart, Bell, User, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
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

export default function Header() {
  const { user, isLoggedIn, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    loadNotifications,
    readAllNotifications,
    readNotification,
  } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const isAdmin = user?.role === USER_ROLE.ADMIN;

  // 로그인 여부 상관없이 첫 화면(Home)은 항상 "/" 하나.
  // 관리자 화면은 별도 메인 화면 개념이 없어서 항상 작은 로고.
  const isMainScreen = !isAdmin && location.pathname === "/";

  const navItems = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const toggleNotifications = () => {
    const nextOpen = !isNotificationOpen;
    setIsNotificationOpen(nextOpen);
    if (nextOpen) void loadNotifications().catch(() => {});
  };

  const notificationPath = (notification) => {
    if (notification.referenceType === "CHAT_ROOM") return `/chat/${notification.referenceIdx}`;
    if (notification.referenceType === "TRANSACTION") return `/payment/${notification.referenceIdx}`;
    if (notification.referenceType === "AUCTION") return `/auction`;
    if (notification.referenceType === "LISTING") return `/products/${notification.referenceIdx}`;
    return "/chat";
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) await readNotification(notification.notificationIdx);
    } finally {
      setIsNotificationOpen(false);
      navigate(notificationPath(notification));
    }
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
              onClick={() => navigate(`/mypage/${user.id}`)}
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
              aria-expanded={isNotificationOpen}
              onClick={toggleNotifications}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span aria-label={`읽지 않은 알림 ${unreadCount}개`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
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
        <div style={{ position: "absolute", top: 88, left: 32, background: "#fff", border: "1px solid #f1e3cf", borderRadius: 8, padding: 12 }}>
          카테고리 메뉴 준비중
        </div>
      )}

      {isNotificationOpen && (
        <section aria-label="알림 목록" style={{ position: "absolute", right: 24, top: 72, width: 340, background: "white", border: "1px solid #ddd", padding: 12, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>알림</strong>
            <button type="button" disabled={unreadCount === 0} onClick={() => void readAllNotifications().catch(() => {})}>모두 읽음</button>
          </div>
          {notifications.length === 0 ? <p>새 알림이 없습니다.</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {notifications.map((notification) => (
                <li key={notification.notificationIdx}>
                  <button type="button" onClick={() => void handleNotificationClick(notification)} style={{ fontWeight: notification.isRead ? "normal" : "bold", textAlign: "left", width: "100%" }}>
                    {notification.content}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </header>
  );
}
