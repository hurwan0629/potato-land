import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, User, MoreVertical } from "lucide-react";
import Pagination from "../../components/list/Pagination";
import ConfirmModal from "../../components/modal/ConfirmModal";
import { adminApi } from "../../api/adminApi";
import "./Users.css";

const LIMIT = 10;

export default function Users() {
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
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    function fetchUsers() {
      setError(null);

      adminApi
        .listUsers({ q: searchTerm, page: currentPage, limit: LIMIT })
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

    fetchUsers();

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
      .banUser(deleteTarget.userIdx, { reason: deleteReason })
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
    <div className="admin-users">
      <h1 className="admin-page-title">회원 관리</h1>

      <div className="admin-search-row">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="회원을 검색하세요"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
      </div>

      {error && <p>회원 목록을 불러오지 못했습니다. ({error})</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-checkbox"><input type="checkbox" /></th>
              <th>회원</th>
              <th>아이디</th>
              <th>전화번호</th>
              <th>가입일</th>
              <th>거래횟수</th>
              <th>조회</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.userIdx}>
                <td className="col-checkbox"><input type="checkbox" /></td>
                <td className="admin-user-cell">
                  <span className="admin-user-avatar"><User size={16} /></span>
                  {u.nickname}
                </td>
                <td>{u.loginId}</td>
                <td>{u.phone}</td>
                <td>{u.createdAt}</td>
                <td>{u.tradeCount}회</td>
                <td>
                  <button
                    type="button"
                    className="admin-icon-btn"
                    aria-label="회원 상세 조회"
                    onClick={() => navigate(`/admin/users/${u.userIdx}`)}
                  >
                    <Search size={16} />
                  </button>
                </td>
                <td className="admin-manage-cell">
                  <button
                    type="button"
                    className="admin-icon-btn"
                    aria-label="관리"
                    onClick={() => setOpenMenuIdx(openMenuIdx === u.userIdx ? null : u.userIdx)}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuIdx === u.userIdx && (
                    <div className="admin-row-menu">
                      <button
                        type="button"
                        className="admin-row-menu-item danger"
                        onClick={() => {
                          setDeleteTarget(u);
                          setOpenMenuIdx(null);
                        }}
                      >
                        회원 삭제
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
          title="회원 삭제"
          confirmLabel="삭제하기"
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
        >
          <p>아이디: {deleteTarget.loginId}</p>
          <p>회원을 정말 삭제하시겠습니까?</p>
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
          title="회원 삭제"
          confirmLabel="닫기"
          showCancel={false}
          onClose={closeDeleteModal}
          onConfirm={closeDeleteModal}
        >
          <p>회원 삭제가 완료되었습니다</p>
        </ConfirmModal>
      )}
    </div>
  );
}
