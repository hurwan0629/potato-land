import { useCallback } from "react";
import { Link } from "react-router";
import { Gavel, ShoppingBag } from "lucide-react";

import { mainApi } from "../../api/appApi";
import primaryPotato from "../../assets/potato/primary-potato.png";
import { useRemote } from "../../hooks/useRemote";
import {
  ErrorState,
  LoadingState,
  ProductGrid,
} from "../components/ui";

function HomeSection({ title, items }) {
  return (
    <section className="home-section page-section">
      <header className="section-heading"><h2>{title}</h2></header>
      <ProductGrid items={items} />
    </section>
  );
}

export default function HomePage() {
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

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-section__copy">
          <h1>오늘의 감자를 찾아보세요</h1>
          <p className="hero-description">
            필요한 물건은 합리적으로,<br />
            특별한 물건은 경매로 만나보세요!
          </p>

          <div className="hero-actions">
            <Link to="/search" className="button">
              <ShoppingBag size={19} />
              중고거래 바로가기
            </Link>
            <Link to="/auction" className="button button--secondary">
              <Gavel size={19} />
              경매장 바로가기
            </Link>
          </div>
        </div>

        <div className="hero-section__visual" aria-hidden="true">
          <div className="potato-mascot"><img src={primaryPotato} alt="" /></div>
        </div>
      </section>

      {isLoading && <LoadingState label="감자나라 상품을 불러오는 중입니다." />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <>
          <HomeSection
            title="중고거래 인기순"
            items={data.usedPopular}
          />

          <HomeSection
            title="경매장 인기순"
            items={data.auctionPopular}
          />

          <HomeSection
            title="최근 등록 상품"
            items={data.recentListings}
          />

          {data.auctionClosingSoon?.length > 0 && (
            <HomeSection
              title="경매장 마감 임박 순"
              items={data.auctionClosingSoon}
            />
          )}
        </>
      )}
    </div>
  );
}
