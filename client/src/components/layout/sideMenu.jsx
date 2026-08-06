// 관리자 및 회원 페이지에서 사이드 메뉴(거래 내역 등이 있는 영역)
import { NavLink } from "react-router";
import "./sideMenu.css";

/**
 * items: [{ to: "/mypage/1", label: "내 정보" }, ...]
 */
export default function SideMenu({ items = [] }) {
  return (
    <aside className="side-menu">
      <ul className="side-menu-list">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                isActive ? "side-menu-item active" : "side-menu-item"
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
