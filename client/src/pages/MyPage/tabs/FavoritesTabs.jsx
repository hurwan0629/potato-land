import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Pagination from "../../../components/list/Pagination";
import { mypageApi } from "../../../api/mypageApi";
import "./FavoritesTab.css";

const FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "USED", label: "중고거래" },
  { key: "AUCTION", label: "경매" },
];

const TYPE_LABEL = {
  USED: "중고거래",
  AUCTION: "경매중",
};

const ITEMS_PER_PAGE = 16;

function formatPrice(price) {
  if (price === null || price === undefined) return "-";
  return `${Number(price).toLocaleString()}원`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

export default function FavoritesTab() {
  const [filter, setFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;

    async function fetchFavorites() {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await mypageApi.getMyFavorites({
          type: filter,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });

        if (ignore) return;

        setItems(data.items);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        if (ignore) return;

        setError(err.message ?? "관심목록을 불러오지 못했습니다.");
        setItems([]);
        setTotalPages(1);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchFavorites();

    return () => {
      ignore = true;
    };
  }, [filter, currentPage]);

  const handleClick = (item) => {
    navigate(item.listingType === "AUCTION" ? `/auction/${item.listingIdx}` : `/used/${item.listingIdx}`);
  };

  return (
    <div className="favorites-tab">
      <h2 className="mypage-content-title">관심 품목</h2>

      <div className="reviews-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "history-filter active" : "history-filter"}
            onClick={() => {
              setFilter(f.key);
              setCurrentPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p>불러오는 중입니다...</p>
      ) : error ? (
        <p>{error}</p>
      ) : items.length === 0 ? (
        <p>관심 등록한 상품이 없습니다.</p>
      ) : (
        <div className="favorites-grid">
          {items.map((item) => (
            <div key={item.listingIdx} className="favorite-card" onClick={() => handleClick(item)}>
              <div className="favorite-thumbnail">
                {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.title} />}
              </div>
              <div className="favorite-title-row">
                <span className="favorite-title">{item.title}</span>
                <span
                  className={
                    item.listingType === "AUCTION"
                      ? "favorite-tag favorite-tag-auction"
                      : "favorite-tag favorite-tag-used"
                  }
                >
                  {TYPE_LABEL[item.listingType] ?? item.listingType}
                </span>
              </div>
              <p className="favorite-price">{formatPrice(item.displayPrice)}</p>
              <div className="favorite-meta">
                <span className="favorite-time">{formatDate(item.favoritedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
