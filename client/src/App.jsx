import { useEffect, useState } from "react";

import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";

const sections = [
  { title: "중고거래 인기순", tone: "used" },
  { title: "경매장 인기순", tone: "auction", timer: "00 : 26 : 18" },
  { title: "최근 등록 상품", tone: "recent" },
  { title: "경매장 마감 임박 순", tone: "auction", timer: "마감 00 : 26 : 18" },
];

/** 브라우저 주소 변경을 구독해 현재 pathname을 React 상태로 유지한다. */
function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const updatePath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  return pathname;
}

/** 메인 목록에서 아직 연동되지 않은 임시 상품 카드를 표시한다. */
function ProductCard({ tone, timer }) {
  return (
    <article className="product-card" aria-label="준비 중인 상품 카드">
      <div className={`product-image ${tone}`}>
        <span>카테고리</span>
        {timer && <b>{timer}</b>}
      </div>
      <p className="product-name">상품명</p>
      <strong className="product-price">상품 가격</strong>
      <div className="product-meta"><span>2분 전</span><span>♡ 500</span></div>
    </article>
  );
}

/** 비로그인 사용자가 처음 보는 상품 탐색 메인 화면을 표시한다. */
function GuestHome() {
  return (
    <div className="page-shell">
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>오늘의 감자를 찾아보세요</h1>
            <p>필요한 물건은 합리적으로,<br />특별한 물건은 경매로 만나보세요!</p>
            <div className="hero-search" aria-disabled="true"><span>⌕</span><span>찾고 싶은 물건을 검색해보세요</span><b>검색</b></div>
            <div className="hero-buttons"><button className="inactive" type="button">▢　중고거래 바로가기</button><button className="inactive" type="button">↗　경매장 바로가기</button></div>
          </div>
          <div className="hero-mascot" aria-hidden="true"><span className="magnifier">⌕</span><span className="potato">🥔</span></div>
        </section>

        <div className="catalog">
          {sections.map((section) => (
            <section className="catalog-section" key={section.title}>
              <h2>{section.title}</h2>
              <div className="product-grid">
                {Array.from({ length: 4 }, (_, index) => <ProductCard key={index} tone={section.tone} timer={section.timer} />)}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** 현재 pathname에 맞는 공개·로그인·회원가입 페이지를 선택한다. */
export default function App() {
  const pathname = usePathname();
  if (pathname === "/login") return <LoginPage />;
  if (pathname === "/signup") return <SignupPage />;
  return <GuestHome />;
}
