import { Heart, Search, ShoppingBag, TrendingUp } from "lucide-react";

import "./Home.css";

const sections = [
  { title: "중고거래 인기순", tone: "used" },
  { title: "경매장 인기순", tone: "auction", timer: "00 : 26 : 18" },
  { title: "최근 등록 상품", tone: "recent" },
  { title: "경매장 마감 임박 순", tone: "auction", timer: "마감 00 : 26 : 18" },
];

/** 비로그인 사용자에게 검색 Hero와 상품 미리보기 목록을 표시한다. */
export default function Home() {
  return (
    <div className="guest-home">
      <section className="guest-hero">
        <div className="guest-hero-copy">
          <h1>오늘의 감자를 찾아보세요</h1>
          <p>필요한 물건은 합리적으로,<br />특별한 물건은 경매로 만나보세요!</p>
          <div className="guest-search" aria-disabled="true"><Search size={26} /><span>찾고 싶은 물건을 검색해보세요</span><b>검색</b></div>
          <div className="guest-hero-buttons"><button type="button"><ShoppingBag size={22} />중고거래 바로가기</button><button type="button"><TrendingUp size={22} />경매장 바로가기</button></div>
        </div>
        <div className="guest-hero-mascot" aria-hidden="true"><span className="guest-magnifier">⌕</span><span className="guest-potato">🥔</span></div>
      </section>

      <div className="guest-catalog">
        {sections.map((section) => <ProductSection key={section.title} {...section} />)}
      </div>
    </div>
  );
}

/** 한 종류의 상품 미리보기 제목과 네 개의 placeholder 카드를 표시한다. */
function ProductSection({ title, tone, timer }) {
  return <section className="guest-section"><h2>{title}</h2><div className="guest-grid">{Array.from({ length: 4 }, (_, index) => <ProductCard key={index} tone={tone} timer={timer} />)}</div></section>;
}

/** 백엔드 상품 API 연결 전 Figma와 동일한 형태의 상품 카드를 표시한다. */
function ProductCard({ tone, timer }) {
  return (
    <article className="guest-card" aria-label="준비 중인 상품 카드">
      <div className={`guest-card-image ${tone}`}><span>카테고리</span>{timer && <b>{timer}</b>}</div>
      <p>상품명</p><strong>상품 가격</strong>
      <div className="guest-card-meta"><span>2분 전</span><span><Heart size={17} />500</span></div>
    </article>
  );
}
