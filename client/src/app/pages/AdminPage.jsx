import { useCallback, useState } from "react";
import {
  Banknote,
  Package,
  Search,
  ShieldAlert,
  ShoppingBag,
  Trophy,
  Users,
} from "lucide-react";
import { Link } from "react-router";

import { adminApi } from "../../api/appApi";
import { useToast } from "../../context/ToastContext";
import { useRemote } from "../../hooks/useRemote";
import { formatCurrency, formatDate, listingPath } from "../../utils/format";
import {
  Avatar,
  EmptyState,
  ErrorState,
  ImageWithFallback,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  StatCard,
  StatusBadge,
  Tabs,
} from "../components/ui";

const ADMIN_TABS = [
  { value: "dashboard", label: "대시보드" },
  { value: "users", label: "회원 관리" },
  { value: "used", label: "중고상품" },
  { value: "auctions", label: "경매" },
  { value: "winners", label: "낙찰 내역" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="page-container admin-page">
      <PageHeader
        eyebrow="Potato Land Admin"
        title="관리자 센터"
        description="회원과 상품, 거래 상태를 한곳에서 확인하고 관리합니다."
        actions={<span className="admin-secure-badge"><ShieldAlert size={17} /> 관리자 전용</span>}
      />
      <Tabs items={ADMIN_TABS} value={tab} onChange={setTab} ariaLabel="관리자 메뉴" />
      {tab === "dashboard" && <DashboardPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "used" && <ListingsPanel listingType="USED" />}
      {tab === "auctions" && <ListingsPanel listingType="AUCTION" />}
      {tab === "winners" && <WinnersPanel />}
    </div>
  );
}

function DashboardPanel() {
  const loadDashboard = useCallback(() => adminApi.dashboard(), []);
  const remote = useRemote(loadDashboard);

  if (remote.isLoading) return <LoadingState label="관리자 통계를 불러오는 중입니다." />;
  if (remote.error) return <ErrorState error={remote.error} onRetry={remote.reload} />;

  const data = remote.data;
  const listingSeries = data.listingRegistrationCounts ?? [];
  const transactionSeries = data.completedTransactionCounts ?? [];
  return (
    <section className="admin-panel">
      <div className="stat-grid">
        <StatCard label="활성 회원" value={`${data.activeUserCount}명`} icon={<Users size={22} />} />
        <StatCard label="전체 상품" value={`${data.totalListingCount}개`} icon={<Package size={22} />} />
        <StatCard label="완료 거래" value={`${data.completedTransactionCount}건`} icon={<ShoppingBag size={22} />} />
        <StatCard label="완료 거래액" value={formatCurrency(data.totalCompletedAmount)} icon={<Banknote size={22} />} />
      </div>

      <div className="admin-chart-grid">
        <TimeSeriesChart
          title="상품 등록 추이"
          description="선택 기간에 등록된 중고·경매 상품 수입니다."
          items={listingSeries}
          variant="line"
        />
        <TimeSeriesChart
          title="거래 완료 추이"
          description="선택 기간에 완료 처리된 거래 수입니다."
          items={transactionSeries}
          variant="bar"
        />
      </div>
    </section>
  );
}

function UsersPanel() {
  const { notify } = useToast();
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedUserIdx, setSelectedUserIdx] = useState(null);

  const loadUsers = useCallback(
    () => adminApi.users({ q: query, status, page, limit: 15 }),
    [page, query, status],
  );
  const remote = useRemote(loadUsers, { items: [], page: 1, totalPages: 0 });

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  };

  return (
    <section className="admin-panel content-card">
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={handleSearch}>
          <Search size={18} />
          <input value={queryInput} placeholder="아이디, 이름, 닉네임 검색" onChange={(event) => setQueryInput(event.target.value)} />
          <button type="submit" className="button button--small">검색</button>
        </form>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="ALL">전체 상태</option>
          <option value="ACTIVE">정상</option>
          <option value="BANNED">정지</option>
          <option value="WITHDRAWN">탈퇴</option>
        </select>
      </div>

      {remote.isLoading && <LoadingState />}
      {remote.error && <ErrorState error={remote.error} onRetry={remote.reload} />}
      {!remote.isLoading && !remote.error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>회원</th><th>아이디</th><th>연락처</th><th>거래</th><th>가입일</th><th>상태</th><th /></tr></thead>
            <tbody>
              {remote.data.items.map((item) => (
                <tr key={item.userIdx}>
                  <td><span className="table-user"><Avatar user={item} size="small" /><strong>{item.nickname}</strong></span></td>
                  <td>{item.loginId}</td>
                  <td><span>{item.phone}</span><small>{item.email}</small></td>
                  <td>{item.tradeCount}건</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td><button type="button" className="button button--ghost button--small" onClick={() => setSelectedUserIdx(item.userIdx)}>상세</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!remote.data.items.length && <EmptyState title="검색된 회원이 없습니다." />}
        </div>
      )}

      <Pagination page={page} totalPages={remote.data.totalPages} onChange={setPage} />
      <UserDetailModal
        userIdx={selectedUserIdx}
        onClose={() => setSelectedUserIdx(null)}
        onChanged={() => {
          remote.reload();
          notify("회원 정보가 변경되었습니다.", "success");
        }}
      />
    </section>
  );
}

function UserDetailModal({ userIdx, onClose, onChanged }) {
  const { notify } = useToast();
  const [memo, setMemo] = useState("");
  const loadUser = useCallback(
    async () => {
      if (!userIdx) return null;
      const user = await adminApi.user(userIdx);
      setMemo(user.adminMemo ?? "");
      return user;
    },
    [userIdx],
  );
  const remote = useRemote(loadUser);

  const saveMemo = async () => {
    try {
      await adminApi.updateMemo(userIdx, memo);
      onChanged();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const banUser = async () => {
    const reason = globalThis.prompt("영구 정지 사유를 입력해주세요.");
    if (!reason?.trim()) return;
    try {
      await adminApi.banUser(userIdx, reason.trim());
      onChanged();
      onClose();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  return (
    <Modal open={Boolean(userIdx)} title="회원 상세" description="회원 활동과 관리자 메모를 확인합니다." onClose={onClose}>
      {remote.isLoading && <LoadingState />}
      {remote.error && <ErrorState error={remote.error} onRetry={remote.reload} />}
      {remote.data && (
        <div className="admin-user-detail">
          <div className="admin-user-detail__profile"><Avatar user={remote.data} size="large" /><div><h3>{remote.data.nickname}</h3><p>{remote.data.loginId} · {remote.data.name}</p><StatusBadge status={remote.data.deletedAt ? "WITHDRAWN" : remote.data.bannedAt ? "BANNED" : "ACTIVE"} /></div></div>
          <div className="mini-stat-grid"><span><b>{remote.data.tradeCount}</b> 거래</span><span><b>{remote.data.listingCount}</b> 상품</span><span><b>{Number(remote.data.averageRating).toFixed(1)}</b> 평점</span></div>
          <label className="form-field"><span>관리자 메모</span><textarea rows={4} value={memo} onChange={(event) => setMemo(event.target.value)} /></label>
          <div className="modal-actions"><button type="button" className="button button--secondary" onClick={saveMemo}>메모 저장</button>{!remote.data.bannedAt && !remote.data.deletedAt && <button type="button" className="button button--danger" onClick={banUser}>회원 영구정지</button>}</div>
        </div>
      )}
    </Modal>
  );
}

function ListingsPanel({ listingType }) {
  const { notify } = useToast();
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const isAuction = listingType === "AUCTION";

  const loadListings = useCallback(
    () => (isAuction ? adminApi.auctions : adminApi.used)({ q: query, page, limit: 15 }),
    [isAuction, page, query],
  );
  const remote = useRemote(loadListings, { items: [], page: 1, totalPages: 0 });

  const remove = async (item) => {
    const reason = globalThis.prompt("관리자 삭제 사유를 입력해주세요.");
    if (!reason?.trim()) return;
    try {
      if (isAuction) await adminApi.removeAuction(item.listingIdx, reason.trim());
      else await adminApi.removeUsed(item.listingIdx, reason.trim());
      remote.reload();
      notify("상품을 삭제했습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  return (
    <section className="admin-panel content-card">
      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(queryInput.trim()); }}>
          <Search size={18} /><input value={queryInput} placeholder="상품명, 판매자, 번호 검색" onChange={(event) => setQueryInput(event.target.value)} /><button className="button button--small" type="submit">검색</button>
        </form>
      </div>
      {remote.isLoading && <LoadingState />}
      {remote.error && <ErrorState error={remote.error} onRetry={remote.reload} />}
      {!remote.isLoading && !remote.error && (
        <div className="admin-listing-list">
          {remote.data.items.map((item) => (
            <article key={item.listingIdx}>
              <ImageWithFallback src={item.thumbnailUrl} alt={item.title} className="admin-listing-list__image" />
              <div className="admin-listing-list__copy"><span>{isAuction ? "경매" : "중고"} #{item.listingIdx}</span><h3><Link to={listingPath(item)}>{item.title}</Link></h3><p>{item.sellerNickname} ({item.sellerLoginId})</p><strong>{formatCurrency(item.currentPrice ?? item.price)}</strong></div>
              <StatusBadge status={item.auctionStatus ?? item.tradeStatus ?? (item.deletedAt ? "DELETED" : "ACTIVE")} />
              <button type="button" className="button button--danger button--small" disabled={Boolean(item.deletedAt)} onClick={() => remove(item)}>삭제</button>
            </article>
          ))}
          {!remote.data.items.length && <EmptyState title="표시할 상품이 없습니다." />}
        </div>
      )}
      <Pagination page={page} totalPages={remote.data.totalPages} onChange={setPage} />
    </section>
  );
}

function WinnersPanel() {
  const [page, setPage] = useState(1);
  const loadWinners = useCallback(() => adminApi.winners({ page, limit: 15 }), [page]);
  const remote = useRemote(loadWinners, { items: [], page: 1, totalPages: 0 });

  return (
    <section className="admin-panel content-card">
      {remote.isLoading && <LoadingState />}
      {remote.error && <ErrorState error={remote.error} onRetry={remote.reload} />}
      <div className="winner-list">
        {remote.data.items.map((item) => (
          <article key={item.listingIdx}>
            <span className="winner-list__icon"><Trophy size={24} /></span>
            <div><span>경매 #{item.listingIdx}</span><h3><Link to={`/auction/${item.listingIdx}`}>{item.title}</Link></h3><p>판매자 {item.sellerNickname} · 낙찰자 {item.winnerNickname}</p></div>
            <strong>{formatCurrency(item.winningPrice)}</strong><small>{formatDate(item.endedAt)}</small>
          </article>
        ))}
        {!remote.isLoading && !remote.data.items.length && <EmptyState title="낙찰 내역이 없습니다." />}
      </div>
      <Pagination page={page} totalPages={remote.data.totalPages} onChange={setPage} />
    </section>
  );
}
