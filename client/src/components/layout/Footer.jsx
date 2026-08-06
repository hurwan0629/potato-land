import "./Footer.css";

/** 최신 Figma 시안의 지원 정보·팀원·서비스 영역을 공통 Footer로 표시한다. */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <strong className="footer-brand">감자나라</strong>
        <section><h3>Support</h3><p>서울특별시 강남구 테헤란로 146 현익빌딩 3, 4층</p><p>tegongmang22 koreaedugroup.com</p><p>+82-02-538-0021</p></section>
        <section><h3>Team</h3><p>Leader 박건희</p><p>Members</p><div className="footer-members"><span>심형준</span><span>윤재빈</span><span>양수연</span><span>최한빈</span><span>허 완</span></div></section>
        <section className="footer-service"><h3>Service</h3><p>중고 거래</p><p>경매</p><p>마이페이지</p><div className="footer-mascots" aria-hidden="true">🔨🥔 🥔 🛒🥔</div></section>
      </div>
      <div className="footer-bottom">ⓒ Copyright 류지보수. All right reserved</div>
    </footer>
  );
}
