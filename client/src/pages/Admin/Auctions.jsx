import { useState, useEffect } from "react";
import { Search, MoreVertical } from "lucide-react";
import Pagination from "../../components/list/Pagination";
import ConfirmModal from "../../components/modal/ConfirmModal";
import { adminApi } from "../../api/adminApi";
import "./Auctions.css";

const LIMIT = 10;

const STATUS_META = {
  URGENT: { label: "마감 임박", className: "status-red" },
  WON: { label: "낙찰", className: "status-yellow" },
  ONGOING: { label: "진행 중", className: "status-green" },
  ENDED: { label: "종료", className: "status-gray" },
};

const formatDate = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString();
};

export default function Auctions() {
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [openMenuIdx, setOpenMenuIdx] = useState(null);
  const [infoTarget, setInfoTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteDone, setDeleteDone] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    function fetchAuctions() {
      setError(null);

      adminApi
        .listAuctions({ q: searchTerm, page: currentPage, limit: LIMIT })
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

    fetchAuctions();

    return () => {
      cancelled = true;
    };
  }, [searchTerm, currentPage]);

  const handleSearch = () => {
    setSearchTerm(keyword);
    setCurrentPage(1);
  };

  const handleDeleteConfirm = () => {
    setDeleteError(null);
    adminApi
      .deleteAuction(deleteTarget.listingIdx, { deleteReason })
      .then(() => setDeleteDone(true))
      .catch((err) => setDeleteError(err.message));
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteReason("");
    setDeleteDone(false);
    setDeleteError(null);
  };

  return (
    <div className="admin-auctions">
      <h1 className="admin-page-title">경매 관리</h1>

      <div className="admin-search-row">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="상품명, 판매자 아이디, 경매번호로 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button type="button" className="admin-search-btn" onClick={handleSearch}>검 색</button>
      </div>

      {error && <p>경매 목록을 불러오지 못했습니다. ({error})</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-checkbox"><input type="checkbox" /></th>
              <th>경매번호</th>
              <th>상품</th>
              <th>판매자</th>
              <th>입찰가</th>
              <th>마감 일시</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const meta = STATUS_META[a.displayStatus] ?? STATUS_META.ENDED;
              return (
                <tr key={a.listingIdx}>
                  <td className="col-checkbox"><input type="checkbox" onClick={(e) => e.stopPropagation()} /></td>
                  <td>{a.listingIdx}</td>
                  <td className="admin-product-cell" onClick={() => setInfoTarget(a)}>
                    <span
                      className="admin-thumbnail"
                      style={a.thumbnailUrl ? { backgroundImage: `url(${a.thumbnailUrl})` } : undefined}
                    />
                    {a.title}
                  </td>
                  <td>{a.sellerNickname}</td>
                  <td>{Number(a.currentPrice ?? 0).toLocaleString()}원</td>
                  <td>{formatDate(a.endsAt)}</td>
                  <td><span className={`admin-status-badge ${meta.className}`}>{meta.label}</span></td>
                  <td className="admin-manage-cell">
                    <button
                      type="button"
                      className="admin-icon-btn"
                      aria-label="관리"
                      onClick={() => setOpenMenuIdx(openMenuIdx === a.listingIdx ? null : a.listingIdx)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuIdx === a.listingIdx && (
                      <div className="admin-row-menu">
                        <button
                          type="button"
                          className="admin-row-menu-item danger"
                          onClick={() => {
                            setDeleteTarget(a);
                            setOpenMenuIdx(null);
                          }}
                        >
                          게시글 삭제
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {infoTarget && (
        <ConfirmModal
          title="경매 정보"
          confirmLabel="닫기"
          showCancel={false}
          onClose={() => setInfoTarget(null)}
          onConfirm={() => setInfoTarget(null)}
        >
          <table className="auction-info-table">
            <tbody>
              <tr><th>낙찰 상품</th><td>{infoTarget.title}</td></tr>
              <tr><th>판매자</th><td>{infoTarget.sellerNickname}</td></tr>
              <tr><th>낙찰자</th><td>{infoTarget.winnerNickname ?? ""}</td></tr>
              <tr><th>최종 낙찰가</th><td>{infoTarget.finalPrice ? Number(infoTarget.finalPrice).toLocaleString() : ""}</td></tr>
              <tr><th>낙찰 날짜</th><td>{formatDate(infoTarget.endedAt)}</td></tr>
            </tbody>
          </table>
        </ConfirmModal>
      )}

      {deleteTarget && !deleteDone && (
        <ConfirmModal
          title="게시물 삭제"
          confirmLabel="삭제하기"
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
        >
          <p>게시물을 삭제하시겠습니까?</p>
          <textarea
            className="confirm-modal-reason"
            placeholder="삭제 사유를 입력하세요"
            rows={3}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
          {deleteError && <p>삭제에 실패했습니다. ({deleteError})</p>}
        </ConfirmModal>
      )}

      {deleteTarget && deleteDone && (
        <ConfirmModal
          title="게시물 삭제"
          confirmLabel="닫기"
          showCancel={false}
          onClose={closeDeleteModal}
          onConfirm={closeDeleteModal}
        >
          <p>게시물이 삭제되었습니다.</p>
        </ConfirmModal>
      )}
    </div>
  );
}
