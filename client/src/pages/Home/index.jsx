import { useEffect, useState } from "react";
import { Heart, Search, ShoppingBag, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";

import { mainApi } from "../../api/mainApi";
import "./Home.css";

const sectionDefinitions = [
  ["중고거래 인기순", "usedPopular", "used"],
  ["경매장 인기순", "auctionPopular", "auction"],
  ["최근 등록 상품", "recentListings", "recent"],
  ["경매장 마감 임박 순", "auctionClosingSoon", "auction"],
];

/** API 날짜를 화면용 날짜 문자열로 변환한다. 값이 없거나 잘못되면 빈 문자열을 반환한다. */
function formatDate(value, { includeTime = false } = {}) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
}

export default function Home() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    mainApi.getMain({ limit: 4 })
      .then((result) => {
        if (!cancelled) setData(result.data);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function submit(event) {
    event.preventDefault();
    const keyword = q.trim();
    if (keyword) navigate(`/search?q=${encodeURIComponent(keyword)}`);
  }

  return (
    <div className="guest-home">
      <section className="guest-hero">
        <div className="guest-hero-copy">
          <h1>오늘의 감자를 찾아보세요</h1>
          <p>
            필요한 물건은 합리적으로,
            <br />
            특별한 물건은 경매로 만나보세요!
          </p>

          <form className="guest-search" onSubmit={submit}>
            <Search size={26} />
            <input
              aria-label="상품 검색"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="찾고 싶은 물건을 검색해보세요"
            />
            <button type="submit">검색</button>
          </form>

          <div className="guest-hero-buttons">
            <button type="button" onClick={() => navigate("/search")}>
              <ShoppingBag size={22} />
              중고거래 바로가기
            </button>
            <button type="button" onClick={() => navigate("/auction")}>
              <TrendingUp size={22} />
              경매장 바로가기
            </button>
          </div>
        </div>

        <div className="guest-hero-mascot" aria-hidden="true">
          <span className="guest-magnifier">⌕</span>
          <span className="guest-potato">🥔</span>
        </div>
      </section>

      <div className="guest-catalog">
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p>상품을 불러오는 중입니다.</p>}
        {data && sectionDefinitions.map(([title, key, tone]) => (
          <ProductSection
            key={key}
            title={title}
            items={data[key] ?? []}
            tone={tone}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}

function ProductSection({ title, items, tone, navigate }) {
  return (
    <section className="guest-section">
      <h2>{title}</h2>
      <div className="guest-grid">
        {items.map((item) => (
          <ProductCard
            key={`${item.listingType}-${item.listingIdx}`}
            item={item}
            tone={tone}
            onClick={() => navigate(
              item.listingType === "AUCTION"
                ? `/auction/${item.listingIdx}`
                : `/products/${item.listingIdx}`,
            )}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ item, tone, onClick }) {
  function openFromKeyboard(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <article
      className="guest-card"
      onClick={onClick}
      onKeyDown={openFromKeyboard}
      role="button"
      tabIndex={0}
    >
      <div className={`guest-card-image ${tone}`}>
        {item.thumbnailUrl
          ? <img src={item.thumbnailUrl} alt="" />
          : <span>{item.category?.name ?? "카테고리"}</span>}
        {item.endsAt && <b>{formatDate(item.endsAt, { includeTime: true })}</b>}
      </div>
      <p>{item.title}</p>
      <strong>{Number(item.displayPrice ?? 0).toLocaleString()}원</strong>
      <div className="guest-card-meta">
        <span>{formatDate(item.createdAt)}</span>
        <span>
          <Heart size={17} />
          {item.favoriteCount ?? 0}
        </span>
      </div>
    </article>
  );
}
