import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowUpRight, MoreHorizontal, Gavel } from "lucide-react";
import Pagination from "../../../components/list/Pagination";
import Button from "../../../components/button/Button";
import { mypageApi } from "../../../api/mypageApi";
import "./ListingsTab.css";

const LIMIT = 5;

// BIGINT 컬럼은 pg 드라이버가 문자열로 반환하므로 숫자 문자열도 함께 처리
const formatPrice = (price) => {
  const numericPrice = Number(price);
  return Number.isFinite(numericPrice) && price !== null && price !== undefined
    ? `${numericPrice.toLocaleString()}원`
    : "가격 미정";
};

const formatDate = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString();
};

const getBadge = (item) => {
  if (item.listingType === "AUCTION") {
    return { label: "경매", className: "listing-badge-auction", icon: Gavel, completed: item.status === "FINISHED" };
  }
  if (item.status === "SOLD") {
    return { label: "판매", className: "listing-badge-sold", icon: ArrowUpRight, completed: true };
  }
  return { label: "판매중", className: "listing-badge-onsale", icon: MoreHorizontal, completed: false };
};

export default function ListingsTab({ userIdx, isMyPage, title }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userIdx) return;

    let cancelled = false;

    function fetchListings() {
      setError(null);

      const params = { type: "ALL", page: currentPage, limit: LIMIT };
      const request = isMyPage
        ? mypageApi.getMyListings(params)
        : mypageApi.getUserListings(userIdx, params);

      request
        .then((res) => {
          if (cancelled) return;
          setItems(res.data.items);
          setTotalPages(res.data.totalPages || 1);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message);
        });
    }

    fetchListings();

    return () => {
      cancelled = true;
    };
  }, [userIdx, isMyPage, currentPage]);

  const handleDetailClick = (item) => {
    navigate(item.listingType === "AUCTION" ? `/auction/${item.listingIdx}` : `/used/${item.listingIdx}`);
  };

  return (
    <div className="listings-tab">
      <h2 className="mypage-content-title">{title}</h2>

      {error && <p>상품을 불러오지 못했습니다. ({error})</p>}

      {!error && items.length === 0 && (
        <p>{isMyPage ? "등록된 상품이 없습니다." : "등록된 판매 상품이 없습니다."}</p>
      )}

      <div className="listing-rows">
        {items.map((item) => {
          const badge = getBadge(item);
          const BadgeIcon = badge.icon;
          return (
            <div key={item.listingIdx} className="listing-row">
              <div className="listing-info">
                <div
                  className="listing-thumbnail"
                  style={item.thumbnailUrl ? { backgroundImage: `url(${item.thumbnailUrl})` } : undefined}
                />
                <div>
                  <p className="listing-title">{item.title}</p>
                  <p className="listing-price">{formatPrice(item.displayPrice)}</p>
                </div>
              </div>

              <span className={`listing-badge ${badge.className}`}>
                <BadgeIcon size={13} />
                {badge.label}
              </span>

              <span className="listing-status-date">
                {badge.completed ? `거래완료 ${formatDate(item.createdAt)}` : ""}
              </span>

              <Button variant="outline" size="sm" onClick={() => handleDetailClick(item)}>
                거래 상세
              </Button>
            </div>
          );
        })}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
