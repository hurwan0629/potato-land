import { useParams } from "react-router";
import SideMenu from "../../components/layout/sideMenu";
// 사용할 api PATCH /api/users/me  /api/users/me/profile
export default function EditProfilePage() {
  const { id } = useParams();

  const menuItems = [
    { to: `/mypage/${id}`, label: "내 정보" },
    { to: `/mypage/${id}/edit`, label: "정보 수정" },
  ];

  return (
    <div style={{ display: "flex" }}>
      <SideMenu items={menuItems} />
      <div style={{ padding: 40, flex: 1 }}>
        <h2>회원 정보 수정</h2>
        <p>닉네임, 비밀번호, 연락처 등을 수정하는 폼이 들어갈 페이지입니다.</p>
      </div>
    </div>
  );
}
