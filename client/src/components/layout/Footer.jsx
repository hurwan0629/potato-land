import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand">🥔 감자나라</div>
          <p className="footer-desc">
            믿을 수 있는 동네 중고거래와 실시간 경매를 한 곳에서,
            감자나라와 함께하세요.
          </p>
        </div>

        <div>
          <div className="footer-col-title">Support</div>
          <ul className="footer-col-list">
            <li>공지사항</li>
            <li>자주 묻는 질문</li>
            <li>1:1 문의</li>
          </ul>
        </div>

        <div>
          <div className="footer-col-title">Company</div>
          <ul className="footer-col-list">
            <li>회사 소개</li>
            <li>이용약관</li>
            <li>개인정보 처리방침</li>
          </ul>
        </div>

        <div>
          <div className="footer-col-title">Follow us</div>
          <ul className="footer-col-list">
            <li>Instagram</li>
            <li>Blog</li>
            <li>Github</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 감자나라. All rights reserved.</span>
        <span>고객센터 1234-5678 (평일 09:00 ~ 18:00)</span>
      </div>
    </footer>
  );
}
