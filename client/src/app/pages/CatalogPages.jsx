import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Gavel, Plus, Search, SlidersHorizontal } from "lucide-react";

import { auctionsApi, mainApi, usedApi } from "../../api/appApi";
import { useRemote } from "../../hooks/useRemote";
import {
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
  ProductGrid,
  Tabs,
} from "../components/ui";

const PRODUCT_TABS = [
  { value: "USED", label: "중고거래" },
  { value: "AUCTION", label: "경매" },
];

const USED_SORT_OPTIONS = [
  { value: "LATEST", label: "최신순" },
  { value: "POPULAR", label: "인기순" },
  { value: "PRICE_ASC", label: "낮은 가격순" },
  { value: "PRICE_DESC", label: "높은 가격순" },
];

const AUCTION_SORT_OPTIONS = [
  { value: "LATEST", label: "최신순" },
  { value: "ENDING_SOON", label: "마감 임박순" },
  { value: "PRICE_ASC", label: "낮은 현재가순" },
  { value: "PRICE_DESC", label: "높은 현재가순" },
];

function getFilterState(searchParams, forcedType) {
  const type = forcedType ?? String(searchParams.get("type") ?? "USED").toUpperCase();
  return {
    type: type === "AUCTION" ? "AUCTION" : "USED",
    q: searchParams.get("q") ?? "",
    categoryIdx: searchParams.get("categoryIdx") ?? "",
    status: searchParams.get("status") ?? "",
    sort: searchParams.get("sort") ?? "LATEST",
    page: Number(searchParams.get("page") ?? 1),
  };
}

function CatalogPage({ forcedType = null }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = useMemo(
    () => getFilterState(searchParams, forcedType),
    [forcedType, searchParams],
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const loadCatalog = useCallback(async () => {
    const parameters = {
      q: filter.q,
      categoryIdx: filter.categoryIdx,
      status: filter.status,
      sort: filter.sort,
      page: filter.page,
      limit: 16,
    };

    const [categories, listings] = await Promise.all([
      mainApi.categories(),
      filter.type === "AUCTION"
        ? auctionsApi.list(parameters)
        : usedApi.list(parameters),
    ]);

    return {
      categories: categories?.items ?? [],
      listings,
    };
  }, [filter.categoryIdx, filter.page, filter.q, filter.sort, filter.status, filter.type]);

  const { data, error, isLoading, reload } = useRemote(loadCatalog);

  const updateFilter = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries({ ...changes, page: changes.page ?? 1 }).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    if (forcedType) {
      next.delete("type");
    }

    setSearchParams(next);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateFilter({ q: formData.get("q")?.toString().trim() ?? "" });
  };

  const sortOptions = filter.type === "AUCTION"
    ? AUCTION_SORT_OPTIONS
    : USED_SORT_OPTIONS;

  return (
    <div className="page-container catalog-page">
      <PageHeader
        eyebrow={filter.type === "AUCTION" ? "실시간 입찰" : "우리 동네 거래"}
        title={filter.type === "AUCTION" ? "경매" : "중고거래"}
        description={
          filter.type === "AUCTION"
            ? "종료 시간과 현재가를 확인하고 원하는 상품에 입찰해보세요."
            : "필요한 물건을 검색하고 판매자와 바로 대화를 시작해보세요."
        }
        actions={(
          <Link
            to={filter.type === "AUCTION" ? "/auction/new" : "/products/register"}
            className="button"
          >
            <Plus size={18} />
            {filter.type === "AUCTION" ? "경매 등록" : "상품 등록"}
          </Link>
        )}
      />

      {!forcedType && (
        <Tabs
          items={PRODUCT_TABS}
          value={filter.type}
          onChange={(type) => updateFilter({ type, status: "", sort: "LATEST" })}
          ariaLabel="상품 유형"
        />
      )}

      <section className="catalog-toolbar">
        <form className="catalog-search" onSubmit={handleSearch}>
          <Search size={19} />
          <input name="q" defaultValue={filter.q} placeholder="상품명이나 설명 검색" />
          <button type="submit">검색</button>
        </form>

        <button
          type="button"
          className="button button--secondary catalog-filter-toggle"
          onClick={() => setMobileFiltersOpen((current) => !current)}
        >
          <SlidersHorizontal size={18} />
          필터
        </button>

        <select
          aria-label="정렬 순서"
          value={filter.sort}
          onChange={(event) => updateFilter({ sort: event.target.value })}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </section>

      <div className="catalog-layout">
        <aside className={`catalog-filter ${mobileFiltersOpen ? "is-open" : ""}`}>
          <div className="catalog-filter__group">
            <strong>카테고리</strong>
            <button
              type="button"
              className={!filter.categoryIdx ? "is-active" : undefined}
              onClick={() => updateFilter({ categoryIdx: "" })}
            >
              전체
            </button>
            {data?.categories.map((category) => (
              <button
                key={category.categoryIdx}
                type="button"
                className={String(category.categoryIdx) === filter.categoryIdx ? "is-active" : undefined}
                onClick={() => updateFilter({ categoryIdx: category.categoryIdx })}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="catalog-filter__group">
            <strong>상태</strong>
            <button
              type="button"
              className={!filter.status ? "is-active" : undefined}
              onClick={() => updateFilter({ status: "" })}
            >
              전체
            </button>
            {filter.type === "AUCTION" ? (
              <>
                <button
                  type="button"
                  className={filter.status === "ON_GOING" ? "is-active" : undefined}
                  onClick={() => updateFilter({ status: "ON_GOING" })}
                >
                  진행 중
                </button>
                <button
                  type="button"
                  className={filter.status === "FINISHED" ? "is-active" : undefined}
                  onClick={() => updateFilter({ status: "FINISHED" })}
                >
                  종료
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={filter.status === "ON_SALE" ? "is-active" : undefined}
                  onClick={() => updateFilter({ status: "ON_SALE" })}
                >
                  판매 중
                </button>
                <button
                  type="button"
                  className={filter.status === "SOLD" ? "is-active" : undefined}
                  onClick={() => updateFilter({ status: "SOLD" })}
                >
                  판매 완료
                </button>
              </>
            )}
          </div>
        </aside>

        <section className="catalog-results">
          <header className="catalog-results__header">
            <div>
              <strong>{Number(data?.listings?.totalCount ?? 0).toLocaleString()}개</strong>
              <span>의 상품을 찾았습니다.</span>
            </div>
            {filter.q && <p>“{filter.q}” 검색 결과</p>}
          </header>

          {isLoading && <LoadingState label="상품을 불러오는 중입니다." />}
          {error && <ErrorState error={error} onRetry={reload} />}
          {data && !isLoading && !error && (
            <>
              <ProductGrid items={data.listings?.items ?? []} />
              <Pagination
                page={data.listings?.page}
                totalPages={data.listings?.totalPages}
                onChange={(page) => updateFilter({ page })}
              />
            </>
          )}
        </section>
      </div>

      {filter.type === "AUCTION" && (
        <button
          type="button"
          className="floating-action"
          aria-label="경매 등록"
          onClick={() => navigate("/auction/new")}
        >
          <Gavel size={20} />
        </button>
      )}
    </div>
  );
}

export function SearchPage() {
  return <CatalogPage />;
}

export function AuctionListPage() {
  return <CatalogPage forcedType="AUCTION" />;
}
