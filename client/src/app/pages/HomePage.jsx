import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Gavel,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import { mainApi } from "../../api/appApi";
import { useRemote } from "../../hooks/useRemote";
import {
  ErrorState,
  LoadingState,
  ProductGrid,
} from "../components/ui";

function HomeSection({ eyebrow, title, description, items, linkTo, linkLabel }) {
  return (
    <section className="home-section page-section">
      <header className="section-heading">
        <div>
          <p className="section-heading__eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <Link to={linkTo} className="text-link">
          {linkLabel}
          <ArrowRight size={17} />
        </Link>
      </header>
      <ProductGrid items={items} />
    </section>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const loadHome = useCallback(async () => {
    const [home, categories] = await Promise.all([
      mainApi.get(4),
      mainApi.categories(),
    ]);
    return {
      ...home,
      categories: categories?.items ?? [],
    };
  }, []);

  const { data, error, isLoading, reload } = useRemote(loadHome);

  const handleHeroSearch = (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q")?.toString().trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-section__copy">
          <p className="hero-kicker">
            <Sparkles size={17} />
            우리 동네 보물찾기
          </p>
          <h1>
            좋은 물건이 돌고 도는 곳,
            <span>감자나라</span>
          </h1>
          <p className="hero-description">
            중고거래부터 실시간 경매까지 안전하게 연결하고,
            채팅과 알림으로 거래 과정을 놓치지 마세요.
          </p>

          <form className="hero-search" onSubmit={handleHeroSearch}>
            <Search size={21} />
            <input name="q" placeholder="찾고 싶은 상품을 입력하세요" />
            <button type="submit">검색</button>
          </form>

          <div className="hero-actions">
            <Link to="/search" className="button">
              <ShoppingBag size={19} />
              중고상품 보기
            </Link>
            <Link to="/auction" className="button button--secondary">
              <Gavel size={19} />
              경매 참여하기
            </Link>
          </div>
        </div>

        <div className="hero-section__visual" aria-hidden="true">
          <div className="potato-mascot">🥔</div>
          <div className="hero-float-card hero-float-card--chat">
            <MessageCircle size={20} />
            실시간 채팅
          </div>
          <div className="hero-float-card hero-float-card--safe">
            <ShieldCheck size={20} />
            안전한 거래
          </div>
          <div className="hero-spark hero-spark--one">✦</div>
          <div className="hero-spark hero-spark--two">✦</div>
        </div>
      </section>

      {isLoading && <LoadingState label="감자나라 상품을 불러오는 중입니다." />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <>
          <section className="category-strip" aria-label="카테고리 바로가기">
            <span>인기 카테고리</span>
            <div>
              {data.categories.map((category) => (
                <button
                  key={category.categoryIdx}
                  type="button"
                  onClick={() => navigate(`/search?categoryIdx=${category.categoryIdx}`)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          <HomeSection
            eyebrow="오늘의 인기"
            title="지금 관심받는 중고상품"
            description="많은 사용자가 찜한 중고상품을 확인해보세요."
            items={data.usedPopular}
            linkTo="/search?sort=POPULAR"
            linkLabel="중고상품 전체보기"
          />

          <HomeSection
            eyebrow="실시간 경매"
            title="마감 전에 입찰해보세요"
            description="현재 진행 중인 인기 경매입니다."
            items={data.auctionPopular}
            linkTo="/auction?sort=ENDING_SOON"
            linkLabel="경매 전체보기"
          />

          <HomeSection
            eyebrow="새로 등록됐어요"
            title="방금 올라온 상품"
            description="중고와 경매를 한 번에 둘러보세요."
            items={data.recentListings}
            linkTo="/search"
            linkLabel="최신 상품 보기"
          />

          {data.auctionClosingSoon?.length > 0 && (
            <HomeSection
              eyebrow="마감 임박"
              title="곧 종료되는 경매"
              description="놓치기 전에 마지막 입찰 기회를 확인하세요."
              items={data.auctionClosingSoon}
              linkTo="/auction?sort=ENDING_SOON"
              linkLabel="마감 임박 경매"
            />
          )}
        </>
      )}
    </div>
  );
}
