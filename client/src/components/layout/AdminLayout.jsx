import { NavLink, Outlet, useNavigate } from "react-router";
import {
  Search,
  LayoutDashboard,
  Users,
  Gavel,
  RefreshCw,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./AdminLayout.css";

const NAV_ITEMS = [
  { to: "/admin", label: "대시보드", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "회원 관리", icon: Users },
  { to: "/admin/auctions", label: "경매 관리", icon: Gavel },
  { to: "/admin/used", label: "중고거래 관리", icon: RefreshCw },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-logo-title">
            <Search size={18} />
            감자 나라
          </span>
          <span className="admin-logo-subtitle">관리자 페이지</span>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? "admin-nav-item active" : "admin-nav-item"
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-sidebar-footer-btn" onClick={handleLogout}>
            <LogOut size={16} />
            로그아웃
          </button>
          <button type="button" className="admin-sidebar-footer-btn" onClick={() => navigate("/")}>
            <ExternalLink size={16} />
            사이트 바로가기
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
