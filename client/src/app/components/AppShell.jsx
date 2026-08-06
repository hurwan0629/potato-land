import { useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import {
  Bell,
  Gavel,
  Heart,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { formatRelativeTime } from "../../utils/format";
import { Avatar, LoadingState, Modal } from "./ui";

function notificationPath(notification) {
  const referenceIdx = Number(notification?.referenceIdx);
  if (!Number.isSafeInteger(referenceIdx) || referenceIdx <= 0) {
    return null;
  }

  const referenceType = String(notification.referenceType ?? "").toUpperCase();
  const notificationType = String(notification.notificationType ?? "").toUpperCase();

  if (referenceType === "CHAT_ROOM") {
    return `/chat/${referenceIdx}`;
  }
  if (referenceType === "TRANSACTION") {
    return `/payment/${referenceIdx}`;
  }
  if (referenceType === "AUCTION" || notificationType.includes("AUCTION") || notificationType === "OUTBID") {
    return `/auction/${referenceIdx}`;
  }
  if (referenceType === "LISTING") {
    return `/products/${referenceIdx}`;
  }

  return null;
}

function Header() {
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { isConnected } = useSocket();
  const {
    notifications,
    unreadCount,
    isLoading,
    read,
    readAll,
  } = useNotifications();
  const { notify } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // 메뉴 항목은 현재 로그인·권한 상태로부터 바로 계산한다.
  // 배열 생성 비용이 작아 수동 memoization보다 단순한 계산이 더 안전하다.
  const navigation = [
    { to: "/search", label: "중고거래", icon: ShoppingBag },
    { to: "/auction", label: "경매", icon: Gavel },
    ...(isLoggedIn
      ? [
          { to: "/chat", label: "채팅", icon: MessageCircle },
          { to: `/mypage/${user.userIdx}`, label: "마이페이지", icon: UserRound },
        ]
      : []),
    ...(isAdmin ? [{ to: "/admin", label: "관리자", icon: ShieldCheck }] : []),
  ];

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      notify("로그아웃되었습니다.", "success");
      navigate("/");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await read(notification.notificationIdx);
      } catch (error) {
        notify(error.message, "error");
      }
    }

    const path = notificationPath(notification);
    if (path) {
      setNotificationOpen(false);
      navigate(path);
    }
  };

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand" aria-label="감자나라 홈">
            <span className="brand__mark" aria-hidden="true">🥔</span>
            <span>
              <strong>감자나라</strong>
              <small>우리 동네 중고마켓</small>
            </span>
          </Link>

          <form className="header-search" onSubmit={handleSearch}>
            <Search size={19} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="어떤 감자를 찾고 있나요?"
              aria-label="상품 검색어"
            />
            <button type="submit">검색</button>
          </form>

          <nav className="desktop-nav" aria-label="주요 메뉴">
            {navigation.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? "is-active" : undefined)}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            {isLoggedIn ? (
              <>
                <span
                  className={`connection-dot ${isConnected ? "is-online" : ""}`}
                  title={isConnected ? "실시간 연결됨" : "실시간 연결 대기 중"}
                />
                <button
                  type="button"
                  className="icon-button header-notification"
                  aria-label={`알림 ${unreadCount}개`}
                  onClick={() => setNotificationOpen(true)}
                >
                  <Bell size={21} />
                  {unreadCount > 0 && <span>{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </button>
                <Link to={`/mypage/${user.userIdx}`} className="header-profile">
                  <Avatar user={user} size="small" />
                  <span>{user.nickname}</span>
                </Link>
                <button type="button" className="icon-button" aria-label="로그아웃" onClick={handleLogout}>
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <Link to="/login" className="button button--small">
                <LogIn size={17} />
                로그인
              </Link>
            )}

            <button
              type="button"
              className="icon-button mobile-menu-button"
              aria-label="메뉴 열기"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            <form className="header-search header-search--mobile" onSubmit={handleSearch}>
              <Search size={19} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="상품 검색"
              />
              <button type="submit">검색</button>
            </form>
            <nav aria-label="모바일 메뉴">
              {navigation.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)}>
                  <Icon size={19} />
                  {label}
                </NavLink>
              ))}
              {!isLoggedIn && (
                <NavLink to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <UserRound size={19} />
                  회원가입
                </NavLink>
              )}
            </nav>
          </div>
        )}
      </header>

      <Modal
        open={notificationOpen}
        title="알림"
        description={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개가 있어요.` : "새로운 알림이 없어요."}
        onClose={() => setNotificationOpen(false)}
        footer={notifications.length > 0 && (
          <button
            type="button"
            className="button button--ghost"
            disabled={unreadCount === 0}
            onClick={() => readAll().catch((error) => notify(error.message, "error"))}
          >
            모두 읽음 처리
          </button>
        )}
      >
        {isLoading && <LoadingState label="알림을 불러오는 중입니다." />}
        {!isLoading && notifications.length === 0 && (
          <div className="notification-empty">
            <Bell size={30} />
            <p>아직 도착한 알림이 없습니다.</p>
          </div>
        )}
        {!isLoading && notifications.length > 0 && (
          <div className="notification-list">
            {notifications.map((notification) => (
              <button
                key={notification.notificationIdx}
                type="button"
                className={`notification-item ${notification.isRead ? "" : "is-unread"}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <span className="notification-item__icon"><Bell size={18} /></span>
                <span>
                  <strong>{notification.content ?? "새 알림이 도착했습니다."}</strong>
                  <small>{formatRelativeTime(notification.createdAt)}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link to="/" className="brand brand--footer">
          <span aria-hidden="true">🥔</span>
          <strong>감자나라</strong>
        </Link>
        <p>안전하고 즐거운 중고거래와 실시간 경매를 한곳에서 만나보세요.</p>
      </div>
      <div className="site-footer__links">
        <Link to="/search">중고거래</Link>
        <Link to="/auction">경매</Link>
        <Link to="/signup">회원가입</Link>
      </div>
      <small>© 2026 Potato Land Team</small>
    </footer>
  );
}

export function MainLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function RequireAuth() {
  const location = useLocation();
  const { isLoggedIn, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingState label="로그인 상태를 확인하는 중입니다." />;
  }

  return isLoggedIn
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

export function RequireGuest() {
  const { isLoggedIn, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingState label="로그인 상태를 확인하는 중입니다." />;
  }

  return isLoggedIn ? <Navigate to="/" replace /> : <Outlet />;
}

export function RequireAdmin() {
  const { isAdmin, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingState label="관리자 권한을 확인하는 중입니다." />;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

export function AccountQuickLinks() {
  return (
    <div className="account-quick-links">
      <Link to="/chat"><MessageCircle size={18} />채팅</Link>
      <Link to="/mypage/me"><Heart size={18} />관심상품</Link>
      <Link to="/mypage/me/edit"><Settings size={18} />정보 수정</Link>
    </div>
  );
}
