import { useEffect, useState } from "react";
import { Gavel, Star } from "lucide-react";
import Pagination from "../../../components/list/Pagination";
import { mypageApi } from "../../../api/mypageApi";
import "./ReviewsTab.css";

const FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "SELLER_REVIEW", label: "판매 후기" },
  { key: "BUYER_REVIEW", label: "구매 후기" },
];

const ITEMS_PER_PAGE = 9;

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

// docs: 후기 rating/평균은 API/DB에서 1~10, UI만 /2해서 0.5~5점으로 표시한다.
function toDisplayRating(rating) {
  return rating / 2;
}

export default function ReviewsTab({ userId, isMyPage }) {
  const [filter, setFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchReviews() {
      setIsLoading(true);
      setError(null);

      try {
        const params = {
          type: filter,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        };

        const { data } = isMyPage
          ? await mypageApi.getMyReviews(params)
          : await mypageApi.getUserReviews(userId, params);

        if (ignore) return;

        setItems(data.items);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        if (ignore) return;

        setError(err.message ?? "후기를 불러오지 못했습니다.");
        setItems([]);
        setTotalPages(1);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchReviews();

    return () => {
      ignore = true;
    };
  }, [filter, currentPage, isMyPage, userId]);

  return (
    <div className="reviews-tab">
      <h2 className="mypage-content-title">거래 후기</h2>

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
        <p>받은 후기가 없습니다.</p>
      ) : (
        <div className="reviews-list">
          {items.map((review) => (
            <div key={review.reviewIdx} className="review-card">
              <div className="review-avatar">
                <Gavel size={20} />
              </div>

              <div className="review-body">
                <div className="review-header">
                  <span className="review-nickname">{review.reviewerNickname}</span>
                  <span className="review-item">{review.listingTitle}</span>
                  <span
                    className={
                      review.reviewType === "SELLER_REVIEW"
                        ? "review-tag review-tag-sell"
                        : "review-tag review-tag-buy"
                    }
                  >
                    {review.reviewType === "SELLER_REVIEW" ? "판매자 후기" : "구매자 후기"}
                  </span>
                  <span className="review-date">{formatDate(review.createdAt)}</span>
                </div>

                <span className="review-rating">
                  <Star size={14} />
                  {toDisplayRating(review.rating).toFixed(1)}
                </span>

                {review.content && (
                  <p className="review-content">{review.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
