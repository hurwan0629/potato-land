import { useState, useEffect } from "react";
import { Search, MoreVertical } from "lucide-react";
import Pagination from "../../components/list/Pagination";
import ConfirmModal from "../../components/modal/ConfirmModal";
import { adminApi } from "../../api/adminApi";
import "./Used.css";

const LIMIT = 10;

const formatDate = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString();
};

export default function Used() {
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [openMenuIdx, setOpenMenuIdx] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteDone, setDeleteDone] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    function fetchUsed() {
      setError(null);

      adminApi
        .listUsed({ q: searchTerm, page: currentPage, limit: LIMIT })
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

    fetchUsed();

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
      .deleteUsed(deleteTarget.listingIdx, { deleteReason })
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
    <div className="admin-used">
      <h1 className="admin-page-title">중고거래 관리</h1>

      <div className="admin-search-row">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="상품명, 판매자 아이디로 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button type="button" className="admin-search-btn" onClick={handleSearch}>검 색</button>
      </div>

      {error && <p>중고거래 목록을 불러오지 못했습니다. ({error})</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-checkbox"><input type="checkbox" /></th>
              <th>상품</th>
              <th>판매자</th>
              <th>구매자</th>
              <th>구매 가격</th>
              <th>구매 날짜</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.listingIdx}>
                <td className="col-checkbox"><input type="checkbox" /></td>
                <td className="admin-product-cell">
                  <span
                    className="admin-thumbnail"
                    style={u.thumbnailUrl ? { backgroundImage: `url(${u.thumbnailUrl})` } : undefined}
                  />
                  {u.title}
                </td>
                <td>{u.sellerNickname}</td>
                <td>{u.buyerNickname ?? "-"}</td>
                <td>{Number(u.price ?? 0).toLocaleString()}원</td>
                <td>{formatDate(u.completedAt)}</td>
                <td>
                  <span className={`admin-status-badge ${u.tradeStatus === "SOLD" ? "status-gray" : "status-yellow"}`}>
                    {u.tradeStatus === "SOLD" ? "거래완료" : "판매중"}
                  </span>
                </td>
                <td className="admin-manage-cell">
                  <button
                    type="button"
                    className="admin-icon-btn"
                    aria-label="관리"
                    onClick={() => setOpenMenuIdx(openMenuIdx === u.listingIdx ? null : u.listingIdx)}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuIdx === u.listingIdx && (
                    <div className="admin-row-menu">
                      <button
                        type="button"
                        className="admin-row-menu-item danger"
                        onClick={() => {
                          setDeleteTarget(u);
                          setOpenMenuIdx(null);
                        }}
                      >
                        게시글 삭제
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

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
