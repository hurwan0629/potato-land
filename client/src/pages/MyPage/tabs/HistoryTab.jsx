import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, MoreHorizontal, Search } from "lucide-react";
import Pagination from "../../../components/list/Pagination";
import Button from "../../../components/button/Button";
import ReviewModal from "../../../components/modal/ReviewModal";
import { mypageApi } from "../../../api/mypageApi";
import "./HistoryTab.css";

const FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "SELL", label: "판매" },
  { key: "BUY", label: "구매" },
  { key: "AUCTION", label: "경매" },
];

const TYPE_META = {
  SELL: { icon: ArrowUpRight, className: "type-sell", label: "판매" },
  BUY: { icon: ArrowDownLeft, className: "type-buy", label: "구매" },
  AUCTION: { icon: MoreHorizontal, className: "type-auction", label: "입찰중" },
};

const STATUS_LABEL = {
  REQUESTED: "거래중",
  COMPLETED: "거래완료",
  CANCELED: "거래취소",
  ON_GOING: "경매중",
  FINISHED: "경매종료",
};

const STATUS_CLASS = {
  COMPLETED: "history-status-done",
  ON_GOING: "history-status-auction",
};

const ITEMS_PER_PAGE = 10;

function formatAmount(amount) {
  if (amount === null || amount === undefined) return "-";
  return `${Number(amount).toLocaleString()}원`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

export default function HistoryTab() {
  const [filter, setFilter] = useState("ALL");
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewTarget, setReviewTarget] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await mypageApi.getMyHistory({
          type: filter,
          status: status || undefined,
          q: keyword || undefined,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });

        if (ignore) return;

        setItems(data.items);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        if (ignore) return;

        setError(err.message ?? "거래내역을 불러오지 못했습니다.");
        setItems([]);
        setTotalPages(1);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchHistory();

    return () => {
      ignore = true;
    };
  }, [filter, status, keyword, currentPage, refreshKey]);

  return (
    <div className="history-tab">
      <h2 className="mypage-content-title">거래 내역</h2>

      <div className="history-filters">
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

      <div className="history-toolbar">
        <select
          className="history-status-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">거래 상태</option>
          <option value="COMPLETED">거래완료</option>
          <option value="ON_GOING">경매중</option>
        </select>

        <div className="history-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="상품명으로 검색"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="history-table-head">
        <span className="col-info">상품 정보</span>
        <span className="col-type">거래 유형</span>
        <span className="col-status">거래 상태</span>
        <span className="col-date">거래일</span>
        <span className="col-manage">관리</span>
      </div>

      {isLoading ? (
        <p>불러오는 중입니다...</p>
      ) : error ? (
        <p>{error}</p>
      ) : items.length === 0 ? (
        <p>거래내역이 없습니다.</p>
      ) : (
        <div className="history-rows">
          {items.map((item) => {
            const TypeIcon = TYPE_META[item.tradeRole].icon;
            return (
              <div key={`${item.transactionIdx ?? "auction"}-${item.listingIdx}`} className="history-row">
                <div className="col-info history-info">
                  <div className="history-thumbnail">
                    {item.thumbnailUrl && (
                      <img src={item.thumbnailUrl} alt={item.title} />
                    )}
                  </div>
                  <div>
                    <p className="history-title">{item.title}</p>
                    <p className="history-price">{formatAmount(item.amount)}</p>
                  </div>
                </div>

                <span className={`col-type history-type ${TYPE_META[item.tradeRole].className}`}>
                  <TypeIcon size={14} />
                  {TYPE_META[item.tradeRole].label}
                </span>

                <span className="col-status">
                  <span className={`history-status-badge ${STATUS_CLASS[item.status] ?? ""}`}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </span>

                <span className="col-date history-date">
                  {formatDate(item.transactionAt ?? item.endsAt)}
                </span>

                <span className="col-manage">
                  {item.canWriteReview && (
                    <Button
                      variant="review"
                      size="sm"
                      onClick={() => setReviewTarget(item)}
                    >
                      후기 작성
                    </Button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {reviewTarget && (
        <ReviewModal
          transactionIdx={reviewTarget.transactionIdx}
          revieweeIdx={reviewTarget.counterpartIdx}
          revieweeNickname={reviewTarget.counterpartNickname}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setReviewTarget(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
