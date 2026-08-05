import SideMenu from "../../components/layout/sideMenu";

export default function Admin() {
  const menuItems = [
    { to: "/admin", label: "대시보드" },
  ];

  return (
    <div style={{ display: "flex" }}>
      <SideMenu items={menuItems} />
      <div style={{ padding: 40, flex: 1 }}>
        <h2>관리자 대시보드</h2>
        <p>전체 회원 수 / 진행 중인 경매 수 / 오늘 등록된 경매 수 / 중고거래 글 수 등이 표시될 영역입니다.</p>
        <p>회원 관리, 경매 관리, 중고거래 관리 메뉴가 이어서 구현될 예정입니다.</p>
      </div>
    </div>
  );
}
