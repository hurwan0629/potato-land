import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Gavel, ArrowRight } from "lucide-react";
import RatingStar from "../../components/input/RatingStar";
import { adminApi } from "../../api/adminApi";
import "./UserDetail.css";

const formatDate = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString();
};

export default function UserDetail() {
  const { userIdx } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [memo, setMemo] = useState("");
  const [memoSaveError, setMemoSaveError] = useState(null);

  useEffect(() => {
    if (!userIdx) return;

    let cancelled = false;

    function fetchUser() {
      setError(null);

      adminApi
        .getUser(userIdx)
        .then((res) => {
          if (cancelled) return;
          setDetail(res.data);
          setMemo(res.data.adminMemo ?? "");
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message);
        });
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userIdx]);

  const handleSaveMemo = () => {
    setMemoSaveError(null);
    adminApi.updateUserMemo(userIdx, { memo }).catch((err) => setMemoSaveError(err.message));
  };

  const user = detail?.user;
  const transactions = detail?.recentTransactions ?? [];
  const reviews = detail?.recentReviews ?? [];

  return (
    <div className="admin-user-detail">
      <div className="admin-detail-header">
        <h1 className="admin-page-title">회원 상세</h1>
        <button type="button" className="admin-back-btn" onClick={() => navigate("/admin/users")}>
          ← 목록으로
        </button>
      </div>

      {error && <p>회원 상세 정보를 불러오지 못했습니다. ({error})</p>}

      <div className="detail-profile-card">
        <div className="detail-avatar">
          <Gavel size={28} />
        </div>
        <div className="detail-profile-info">
          <div className="detail-profile-name">
            <strong>{user?.nickname ?? "-"}</strong>
            <span>{user?.loginId ? `@${user.loginId}` : ""}</span>
          </div>
          <div className="detail-profile-meta">
            <span>회원 번호 {user?.userIdx ?? userIdx}</span>
            <span>가입일 {formatDate(user?.createdAt)}</span>
            <span>최근 접속 -</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-box">
          <h2>기본 정보</h2>
          <table className="detail-info-table">
            <tbody>
              <tr><th>닉네임</th><td>{user?.nickname ?? "-"}</td></tr>
              <tr><th>이름</th><td>{user?.name ?? "-"}</td></tr>
              <tr><th>전화번호</th><td>{user?.phone ?? "-"}</td></tr>
              <tr><th>이메일</th><td>{user?.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : "-"}</td></tr>
            </tbody>
          </table>

          <h2 className="detail-box-title-spaced">
            거래 활동 <span className="detail-count">총 {transactions.length}건</span>
            <button type="button" className="detail-more-link">전체 보기</button>
          </h2>
          <div className="detail-transactions">
            <div className="detail-transactions-head">
              <span>상품명</span>
              <span>거래 유형</span>
              <span>거래 금액</span>
              <span>거래 상태</span>
              <span>거래 날짜</span>
              <span />
            </div>
            {transactions.map((t) => (
              <div key={t.transactionIdx} className="detail-transaction-row">
                <span className="detail-transaction-title">
                  <span
                    className="detail-thumbnail"
                    style={t.thumbnailUrl ? { backgroundImage: `url(${t.thumbnailUrl})` } : undefined}
                  />
                  {t.title}
                </span>
                <span>
                  <span className={t.listingType === "AUCTION" ? "detail-pill pill-purple" : "detail-pill pill-blue"}>
                    {t.listingType === "AUCTION" ? "경매" : "중고거래"}
                  </span>
                </span>
                <span>{Number(t.amount).toLocaleString()}원</span>
                <span>
                  <span className={t.tradeRole === "SELL" ? "detail-pill pill-orange" : "detail-pill pill-red"}>
                    {t.tradeRole === "SELL" ? "판매상품" : "구매상품"}
                  </span>
                </span>
                <span>{formatDate(t.completedAt)}</span>
                <span><ArrowRight size={14} /></span>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-side">
          <div className="detail-box">
            <h2>
              후기 활동 <span className="detail-count">총 {reviews.length}건</span>
              <button type="button" className="detail-more-link">전체 보기</button>
            </h2>
            <div className="detail-reviews">
              {reviews.map((r) => (
                <div key={r.reviewIdx} className="detail-review-row">
                  <div className="detail-review-head">
                    <RatingStar rating={r.rating / 2} size={13} />
                    <span className="detail-pill pill-orange">
                      {r.reviewType === "BUYER_REVIEW" ? "구매자 후기" : "판매자 후기"}
                    </span>
                    <span className="detail-review-date">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="detail-review-body">
                    {r.reviewerNickname} · {r.listingTitle}
                  </p>
                  <p className="detail-review-content">{r.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-box">
            <h2>메모</h2>
            <textarea
              className="detail-memo"
              placeholder="사용자에 대한 관리자 메모를 입력하세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={5}
            />
            {memoSaveError && <p>메모 저장에 실패했습니다. ({memoSaveError})</p>}
            <button type="button" className="detail-memo-save" onClick={handleSaveMemo}>
              저 장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
