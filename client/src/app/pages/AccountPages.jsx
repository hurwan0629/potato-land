import { useCallback, useMemo, useState } from "react";
import {
  BadgeCheck,
  FileText,
  Heart,
  History,
  KeyRound,
  LogOut,
  Package,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import {
  authApi,
  mypageApi,
  reviewsApi,
  usersApi,
} from "../../api/appApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useRemote } from "../../hooks/useRemote";
import {
  formatCurrency,
  formatDate,
  listingPath,
  normalizePhone,
} from "../../utils/format";
import {
  Avatar,
  EmptyState,
  ErrorState,
  ImageWithFallback,
  InlineAlert,
  LoadingState,
  PageHeader,
  Pagination,
  ProductGrid,
  Rating,
  StatCard,
  StatusBadge,
  Tabs,
} from "../components/ui";

const PROFILE_TABS = [
  { value: "listings", label: "판매 상품", icon: Package },
  { value: "favorites", label: "관심 상품", icon: Heart, ownOnly: true },
  { value: "history", label: "거래 내역", icon: History, ownOnly: true },
  { value: "reviews", label: "후기", icon: Star },
];

export function MyPage() {
  const { userIdx } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("listings");
  const [page, setPage] = useState(1);

  const requestedUserIdx = userIdx === "me" ? Number(user.userIdx) : Number(userIdx);
  const isOwner = requestedUserIdx === Number(user.userIdx);

  const loadProfile = useCallback(
    () => isOwner ? usersApi.me() : usersApi.profile(requestedUserIdx),
    [isOwner, requestedUserIdx],
  );
  const profileRemote = useRemote(loadProfile);

  const loadTab = useCallback(() => {
    const parameters = { page, limit: 12 };
    if (activeTab === "listings") {
      return isOwner
        ? mypageApi.myListings(parameters)
        : mypageApi.userListings(requestedUserIdx, parameters);
    }
    if (activeTab === "favorites") {
      return mypageApi.favorites(parameters);
    }
    if (activeTab === "history") {
      return mypageApi.history(parameters);
    }
    if (isOwner) {
      return mypageApi.reviews({ ...parameters, type: "RECEIVED" });
    }
    return reviewsApi.received(requestedUserIdx, parameters);
  }, [activeTab, isOwner, page, requestedUserIdx]);
  const tabRemote = useRemote(loadTab, { items: [], page: 1, totalPages: 0 });

  const tabs = useMemo(
    () => PROFILE_TABS.filter((tab) => isOwner || !tab.ownOnly),
    [isOwner],
  );

  const handleTab = (value) => {
    setActiveTab(value);
    setPage(1);
  };

  if (profileRemote.isLoading) {
    return <div className="page-container"><LoadingState label="프로필을 불러오는 중입니다." /></div>;
  }
  if (profileRemote.error) {
    return <div className="page-container"><ErrorState error={profileRemote.error} onRetry={profileRemote.reload} /></div>;
  }

  const profile = profileRemote.data;

  return (
    <div className="page-container account-page">
      <section className="profile-hero">
        <Avatar user={profile} size="large" />
        <div className="profile-hero__copy">
          <p className="eyebrow">{isOwner ? "나의 감자나라" : "판매자 프로필"}</p>
          <h1>{profile.nickname}</h1>
          <p>{profile.bio || "아직 작성한 소개가 없습니다."}</p>
          <Rating value={profile.averageRating} reviewCount={profile.reviewCount} />
        </div>
        {isOwner && (
          <button type="button" className="button button--secondary" onClick={() => navigate("/mypage/me/edit")}>
            <UserRound size={18} />
            내 정보 수정
          </button>
        )}
      </section>

      <div className="stat-grid stat-grid--profile">
        <StatCard label="판매" value={`${Number(profile.sellCount ?? 0)}건`} icon={<Package size={22} />} />
        <StatCard label="구매" value={`${Number(profile.buyCount ?? 0)}건`} icon={<BadgeCheck size={22} />} />
        <StatCard label="받은 후기" value={`${Number(profile.reviewCount ?? 0)}개`} icon={<Star size={22} />} />
      </div>

      <section className="content-card profile-content">
        <Tabs
          items={tabs.map(({ value, label }) => ({ value, label }))}
          value={activeTab}
          onChange={handleTab}
          ariaLabel="마이페이지 메뉴"
        />

        {tabRemote.isLoading && <LoadingState />}
        {tabRemote.error && <ErrorState error={tabRemote.error} onRetry={tabRemote.reload} />}
        {!tabRemote.isLoading && !tabRemote.error && (
          <ProfileTabContent
            type={activeTab}
            items={tabRemote.data.items ?? []}
            isOwner={isOwner}
          />
        )}

        <Pagination
          page={page}
          totalPages={tabRemote.data.totalPages}
          onChange={setPage}
        />
      </section>
    </div>
  );
}

function ProfileTabContent({ type, items, isOwner }) {
  if (type === "listings" || type === "favorites") {
    return (
      <ProductGrid
        items={items}
        emptyTitle={type === "favorites" ? "관심상품이 없습니다." : "등록한 상품이 없습니다."}
      />
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title={type === "history" ? "거래 내역이 없습니다." : "아직 후기가 없습니다."}
        description={isOwner ? "감자나라에서 첫 거래를 시작해보세요." : "첫 거래 후기를 기다리고 있어요."}
      />
    );
  }

  if (type === "history") {
    return (
      <div className="history-list">
        {items.map((item) => (
          <article key={`${item.transactionIdx ?? "bid"}-${item.listingIdx}`} className="history-card">
            <Link to={listingPath(item)} className="history-card__media">
              <ImageWithFallback src={item.thumbnailUrl} alt={item.title} />
            </Link>
            <div>
              <div className="history-card__top">
                <span>{item.listingType === "AUCTION" ? "경매" : "중고거래"}</span>
                <StatusBadge status={item.status} />
              </div>
              <h3>{item.title}</h3>
              <strong>{formatCurrency(item.amount ?? item.displayPrice)}</strong>
              <p>{item.counterpartNickname ? `거래 상대: ${item.counterpartNickname}` : "입찰 참여 내역"}</p>
              <small>{formatDate(item.displayDate ?? item.endsAt)}</small>
            </div>
            {item.transactionIdx && (
              <Link className="button button--secondary button--small" to={`/payment/${item.transactionIdx}`}>
                거래 보기
              </Link>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="review-list">
      {items.map((review) => (
        <article key={review.reviewIdx} className="review-card">
          <div className="review-card__header">
            <Avatar user={{ nickname: review.reviewerNickname }} size="small" />
            <div>
              <strong>{review.reviewerNickname ?? "감자 사용자"}</strong>
              <small>{formatDate(review.createdAt)}</small>
            </div>
            <Rating value={Number(review.rating ?? 0) / 2} compact />
          </div>
          <p>{review.content || "내용 없이 평점만 남긴 후기입니다."}</p>
          {review.tags?.length > 0 && (
            <div className="tag-list">
              {review.tags.map((tag) => <span key={tag.tagIdx ?? tag.name}>{tag.name}</span>)}
            </div>
          )}
          {review.listingTitle && <small>거래 상품: {review.listingTitle}</small>}
        </article>
      ))}
    </div>
  );
}

export function AccountEditPage() {
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuth();
  const { notify } = useToast();
  const [profileImage, setProfileImage] = useState(null);
  const [publicForm, setPublicForm] = useState({ nickname: "", bio: "" });
  const [accountForm, setAccountForm] = useState({
    phone: "",
    email: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [editToken, setEditToken] = useState("");
  const [phoneVerificationId, setPhoneVerificationId] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const loadAccount = useCallback(async () => {
    const account = await usersApi.me();
    setPublicForm({ nickname: account.nickname ?? "", bio: account.bio ?? "" });
    setAccountForm({
      phone: account.phone ?? "",
      email: account.email ?? "",
      newPassword: "",
      newPasswordConfirm: "",
    });
    return account;
  }, []);
  const accountRemote = useRemote(loadAccount);

  const loadSessions = useCallback(
    () => sessionsOpen ? authApi.sessions() : Promise.resolve({ items: [] }),
    [sessionsOpen],
  );
  const sessionsRemote = useRemote(loadSessions, { items: [] });

  const verifyCurrentPassword = async () => {
    if (!currentPassword) {
      notify("현재 비밀번호를 입력해주세요.", "error");
      return;
    }

    setIsWorking(true);
    try {
      const result = await usersApi.verifyPassword(currentPassword);
      setEditToken(result.editToken);
      notify("본인 확인이 완료되었습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const savePublicProfile = async (event) => {
    event.preventDefault();
    setIsWorking(true);
    try {
      await usersApi.updatePublicProfile({
        ...publicForm,
        image: profileImage,
      });
      await refreshUser();
      accountRemote.reload();
      notify("프로필을 저장했습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const sendPhoneCode = async () => {
    if (!editToken) {
      notify("먼저 현재 비밀번호로 본인 확인을 해주세요.", "error");
      return;
    }

    setIsWorking(true);
    try {
      const result = await authApi.sendPhoneCode({
        phone: normalizePhone(accountForm.phone),
        purpose: "CHANGE_PHONE",
      });
      setPhoneVerificationId(result.phoneVerificationId);
      setPhoneVerified(false);
      notify("인증번호를 발송했습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const verifyPhoneCode = async () => {
    setIsWorking(true);
    try {
      await authApi.verifyPhoneCode({
        phone: normalizePhone(accountForm.phone),
        purpose: "CHANGE_PHONE",
        phoneVerificationId,
        code: phoneCode,
      });
      setPhoneVerified(true);
      notify("새 휴대전화 번호가 인증되었습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    if (!editToken) {
      notify("현재 비밀번호 확인이 필요합니다.", "error");
      return;
    }
    if (accountForm.newPassword !== accountForm.newPasswordConfirm) {
      notify("새 비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    setIsWorking(true);
    try {
      await usersApi.update({
        editToken,
        nickname: publicForm.nickname,
        phone: normalizePhone(accountForm.phone),
        email: accountForm.email,
        newPassword: accountForm.newPassword,
        newPasswordConfirm: accountForm.newPasswordConfirm,
        phoneVerificationId: phoneVerified ? phoneVerificationId : undefined,
      });
      setEditToken("");
      setCurrentPassword("");
      setPhoneVerificationId("");
      setPhoneVerified(false);
      await refreshUser();
      accountRemote.reload();
      notify("계정 정보를 저장했습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsWorking(false);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await authApi.deleteSession(sessionId);
      sessionsRemote.reload();
      notify("선택한 기기에서 로그아웃했습니다.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const logoutAll = async () => {
    if (!globalThis.confirm("모든 기기에서 로그아웃할까요?")) {
      return;
    }
    await authApi.logoutAll();
    await logout();
    navigate("/login", { replace: true });
  };

  const withdraw = async () => {
    if (!editToken) {
      notify("탈퇴 전에 현재 비밀번호 확인이 필요합니다.", "error");
      return;
    }
    if (!globalThis.confirm("정말 감자나라를 탈퇴할까요? 진행 중 상태가 함께 정리됩니다.")) {
      return;
    }

    try {
      await usersApi.withdraw(editToken);
      await logout();
      notify("회원 탈퇴가 완료되었습니다.", "success");
      navigate("/", { replace: true });
    } catch (error) {
      notify(error.message, "error");
    }
  };

  if (accountRemote.isLoading) {
    return <div className="page-container"><LoadingState label="계정 정보를 불러오는 중입니다." /></div>;
  }
  if (accountRemote.error) {
    return <div className="page-container"><ErrorState error={accountRemote.error} onRetry={accountRemote.reload} /></div>;
  }

  const account = accountRemote.data;

  return (
    <div className="page-container account-edit-page">
      <PageHeader
        eyebrow="계정 설정"
        title="내 정보 수정"
        description="프로필과 개인정보, 로그인된 기기를 안전하게 관리하세요."
        actions={<Link to={`/mypage/${account.userIdx}`} className="button button--secondary">내 프로필 보기</Link>}
      />

      <div className="settings-grid">
        <form className="content-card settings-card" onSubmit={savePublicProfile}>
          <div className="settings-card__title">
            <UserRound size={22} />
            <div><h2>공개 프로필</h2><p>다른 사용자에게 표시되는 정보입니다.</p></div>
          </div>
          <div className="profile-image-editor">
            <Avatar user={account} size="large" />
            <label className="button button--secondary button--small">
              <Upload size={17} />
              이미지 선택
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => setProfileImage(event.target.files?.[0] ?? null)} />
            </label>
          </div>
          <label className="form-field"><span>닉네임</span><input value={publicForm.nickname} onChange={(event) => setPublicForm((current) => ({ ...current, nickname: event.target.value }))} /></label>
          <label className="form-field"><span>소개</span><textarea rows={5} maxLength={500} value={publicForm.bio} onChange={(event) => setPublicForm((current) => ({ ...current, bio: event.target.value }))} /></label>
          <button className="button" disabled={isWorking} type="submit"><Save size={18} />프로필 저장</button>
        </form>

        <section className="content-card settings-card">
          <div className="settings-card__title">
            <KeyRound size={22} />
            <div><h2>본인 확인</h2><p>개인정보 수정과 탈퇴 전에 필요합니다.</p></div>
          </div>
          <label className="form-field"><span>현재 비밀번호</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
          <button type="button" className="button button--secondary" disabled={isWorking || Boolean(editToken)} onClick={verifyCurrentPassword}>
            <ShieldCheck size={18} />
            {editToken ? "확인 완료" : "현재 비밀번호 확인"}
          </button>
          {editToken && <InlineAlert type="success">10분 동안 개인정보 수정과 탈퇴가 가능합니다.</InlineAlert>}
        </section>

        <form className="content-card settings-card settings-card--wide" onSubmit={saveAccount}>
          <div className="settings-card__title">
            <FileText size={22} />
            <div><h2>계정 정보</h2><p>전화번호나 비밀번호를 변경할 수 있습니다.</p></div>
          </div>
          <div className="form-grid form-grid--two">
            <label className="form-field"><span>아이디</span><input value={account.loginId ?? ""} disabled /></label>
            <label className="form-field"><span>이름</span><input value={account.name ?? ""} disabled /></label>
            <label className="form-field"><span>이메일</span><input type="email" value={accountForm.email} onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))} /></label>
            <label className="form-field"><span>휴대전화</span><input value={accountForm.phone} onChange={(event) => { setAccountForm((current) => ({ ...current, phone: event.target.value })); setPhoneVerified(false); }} /></label>
          </div>
          <div className="phone-edit-row">
            <button type="button" className="button button--secondary button--small" disabled={!editToken || isWorking} onClick={sendPhoneCode}>새 번호 인증</button>
            {phoneVerificationId && !phoneVerified && (
              <><input value={phoneCode} maxLength={6} placeholder="인증번호 6자리" onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ""))} /><button type="button" className="button button--small" onClick={verifyPhoneCode}>확인</button></>
            )}
            {phoneVerified && <span className="field-success">인증 완료</span>}
          </div>
          <div className="form-grid form-grid--two">
            <label className="form-field"><span>새 비밀번호</span><input type="password" autoComplete="new-password" value={accountForm.newPassword} onChange={(event) => setAccountForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="변경하지 않으면 비워두세요" /></label>
            <label className="form-field"><span>새 비밀번호 확인</span><input type="password" autoComplete="new-password" value={accountForm.newPasswordConfirm} onChange={(event) => setAccountForm((current) => ({ ...current, newPasswordConfirm: event.target.value }))} /></label>
          </div>
          <button className="button" disabled={!editToken || isWorking} type="submit"><Save size={18} />계정 정보 저장</button>
        </form>

        <section className="content-card settings-card settings-card--wide">
          <div className="settings-card__title">
            <LogOut size={22} />
            <div><h2>로그인된 기기</h2><p>사용하지 않는 기기의 세션을 종료하세요.</p></div>
          </div>
          <button type="button" className="button button--secondary" onClick={() => setSessionsOpen((current) => !current)}>{sessionsOpen ? "기기 목록 닫기" : "기기 목록 확인"}</button>
          {sessionsOpen && sessionsRemote.isLoading && <LoadingState />}
          {sessionsOpen && sessionsRemote.error && <ErrorState error={sessionsRemote.error} onRetry={sessionsRemote.reload} />}
          {sessionsOpen && (
            <div className="session-list">
              {(sessionsRemote.data.items ?? sessionsRemote.data.sessions ?? []).map((session) => (
                <article key={session.sessionId}>
                  <div><strong>{session.userAgent || "알 수 없는 기기"}</strong><small>{session.ip} · {formatDate(session.rotatedAt)}</small></div>
                  <button type="button" className="button button--ghost button--small" onClick={() => deleteSession(session.sessionId)}>로그아웃</button>
                </article>
              ))}
              <button type="button" className="button button--danger button--small" onClick={logoutAll}>모든 기기 로그아웃</button>
            </div>
          )}
        </section>

        <section className="content-card settings-card danger-zone settings-card--wide">
          <div className="settings-card__title"><Trash2 size={22} /><div><h2>회원 탈퇴</h2><p>탈퇴하면 진행 중 거래와 경매 상태가 정리됩니다.</p></div></div>
          <button type="button" className="button button--danger" disabled={!editToken} onClick={withdraw}><Trash2 size={18} />회원 탈퇴</button>
        </section>
      </div>
    </div>
  );
}
