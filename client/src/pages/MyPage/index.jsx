import { useParams } from "react-router";
import SideMenu from "../../components/layout/sideMenu";
import { useAuth } from "../../context/AuthContext";

export default function MyPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const menuItems = [
    { to: `/mypage/${id}`, label: "내 정보" },
    { to: `/mypage/${id}/edit`, label: "정보 수정" },
  ];

  return (
    <div style={{ display: "flex" }}>
      <SideMenu items={menuItems} />
      <div style={{ padding: 40, flex: 1 }}>
        <h2>마이페이지</h2>
        <p>닉네임: {user?.nickname ?? id}</p>
        <p>거래 내역, 판매/구매 목록, 후기 등이 표시될 영역입니다.</p>
      </div>
    </div>
  );
}
