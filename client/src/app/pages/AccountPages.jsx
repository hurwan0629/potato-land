import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  X,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

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
  Modal,
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
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedUserIdx = userIdx === "me" ? Number(user.userIdx) : Number(userIdx);
  const isOwner = requestedUserIdx === Number(user.userIdx);
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() => {
    const accessible = PROFILE_TABS.some(
      (tab) => tab.value === requestedTab && (isOwner || !tab.ownOnly),
    );
    return accessible ? requestedTab : "listings";
  });
  const [page, setPage] = useState(1);

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
      return mypageApi.reviews({ ...parameters, direction: "RECEIVED", type: "ALL" });
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
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", value);
      return next;
    }, { replace: true });
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
      <aside className="mypage-sidebar">
        <section className="profile-hero">
          <Avatar user={profile} size="large" />
          <div className="profile-hero__copy">
            <h1>{profile.nickname}</h1>
            <p>{profile.bio || "아직 작성한 소개가 없습니다."}</p>
          </div>
          {isOwner && (
            <div className="profile-edit-actions">
              <button type="button" className="button button--secondary" onClick={() => navigate("/mypage/me/edit?mode=profile")}><UserRound size={16} />프로필 수정</button>
              <button type="button" className="button button--secondary" onClick={() => navigate("/mypage/me/edit?mode=account")}><FileText size={16} />회원 정보 수정</button>
            </div>
          )}
        </section>

        <Tabs items={tabs.map(({ value, label }) => ({ value, label }))} value={activeTab} onChange={handleTab} ariaLabel="마이페이지 메뉴" />

        <div className="mypage-trade-stats">
          <StatCard label="판매" value={Number(profile.sellCount ?? 0)} icon={<Package size={20} />} />
          <StatCard label="구매" value={Number(profile.buyCount ?? 0)} icon={<BadgeCheck size={20} />} />
        </div>
        <div className="mypage-rating-card">
          <span>평균 평점</span>
          <strong>{Number(profile.averageRating / 2 ?? 0).toFixed(1)}</strong>
          <Rating value={profile.averageRating / 2} reviewCount={profile.reviewCount} />
        </div>
      </aside>

      <section className="content-card profile-content">
        <h2>{tabs.find((tab) => tab.value === activeTab)?.label ?? "판매 상품"}</h2>

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
            <div className="history-card__info">
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
              <Link className="button button--secondary button--small history-card__action" to={`/payment/${item.transactionIdx}`}>
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
          {review.listingTitle && <small>거래 상품: {review.listingTitle}</small>}
        </article>
      ))}
    </div>
  );
}

export function AccountEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get("mode") === "profile" ? "profile" : "account";
  const { refreshUser, logout } = useAuth();
  const { notify } = useToast();
  const [profileImage, setProfileImage] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);
  const profilePreviewUrlRef = useRef(null);
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
  const [passwordVerificationError, setPasswordVerificationError] = useState("");
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const nicknameValid = publicForm.nickname.length >= 2 && publicForm.nickname.length <= 12;
  const newPasswordValid = !accountForm.newPassword || (
    accountForm.newPassword.length >= 8
    && accountForm.newPassword.length <= 20
    && [/[A-Za-z]/, /\d/, /[^A-Za-z\d]/].filter((pattern) => pattern.test(accountForm.newPassword)).length >= 2
  );
  const newPasswordMatches = accountForm.newPassword === accountForm.newPasswordConfirm;

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

  useEffect(() => () => {
    if (profilePreviewUrlRef.current) {
      URL.revokeObjectURL(profilePreviewUrlRef.current);
    }
  }, []);

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (profilePreviewUrlRef.current) {
      URL.revokeObjectURL(profilePreviewUrlRef.current);
    }

    const nextPreviewUrl = file ? URL.createObjectURL(file) : null;
    profilePreviewUrlRef.current = nextPreviewUrl;
    setProfileImage(file);
    setProfilePreviewUrl(nextPreviewUrl);
  };

  const loadSessions = useCallback(
    () => sessionsOpen ? authApi.sessions() : Promise.resolve({ items: [] }),
    [sessionsOpen],
  );
  const sessionsRemote = useRemote(loadSessions, { items: [] });

  const verifyCurrentPassword = async () => {
    if (!currentPassword) {
      setPasswordVerificationError("현재 비밀번호를 입력해주세요.");
      return;
    }

    setPasswordVerificationError("");
    setIsWorking(true);
    try {
      const result = await usersApi.verifyPassword(currentPassword);
      setEditToken(result.editToken);
      setPasswordVerificationError("");
      notify("본인 확인이 완료되었습니다.", "success");
    } catch (error) {
      setPasswordVerificationError(error.message);
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
      setProfileImage(null);
      accountRemote.reload();
      notify("프로필을 저장했습니다.", "success");
      navigate(`/mypage/${accountRemote.data.userIdx}`, { replace: true });
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
    if (!nicknameValid) {
      notify("닉네임은 2~12자로 입력해주세요.", "error");
      return;
    }
    if (accountForm.newPassword !== accountForm.newPasswordConfirm) {
      notify("새 비밀번호가 일치하지 않습니다.", "error");
      return;
    }
    if (!newPasswordValid) {
      notify("새 비밀번호 형식을 확인해주세요.", "error");
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
      navigate(`/mypage/${accountRemote.data.userIdx}`, { replace: true });
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
    try {
      await authApi.logoutAll();
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutAllOpen(false);
      notify(error.message, "error");
    }
  };

  const withdraw = async () => {
    if (!editToken) {
      notify("탈퇴 전에 현재 비밀번호 확인이 필요합니다.", "error");
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
    <div className={`page-container account-edit-page mode-${editMode} ${editToken ? "is-verified" : "is-unverified"}`}>
      <button type="button" className="account-edit-close" aria-label="회원정보 수정 닫기" onClick={() => navigate(`/mypage/${account.userIdx}`)}><X size={28} /></button>
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
            <div><h2>프로필 수정</h2><p>다른 사용자에게 표시되는 정보입니다.</p></div>
          </div>
          <div className="profile-image-editor">
            <Avatar
              user={{
                ...account,
                profileImageUrl: profilePreviewUrl ?? account.profileImageUrl,
              }}
              size="large"
            />
            <label className="button button--secondary button--small">
              <Upload size={17} />
              이미지 선택
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleProfileImageChange}
              />
            </label>
          </div>
          <label className="form-field"><span>닉네임</span><input value={publicForm.nickname} onChange={(event) => setPublicForm((current) => ({ ...current, nickname: event.target.value }))} /></label>
          <label className="form-field"><span>소개</span><textarea rows={5} maxLength={500} value={publicForm.bio} onChange={(event) => setPublicForm((current) => ({ ...current, bio: event.target.value }))} /></label>
          <button className="button" disabled={isWorking} type="submit"><Save size={18} />프로필 저장</button>
        </form>

        <form className="content-card settings-card" onSubmit={(event) => { event.preventDefault(); verifyCurrentPassword(); }}>
          <div className="settings-card__title">
            <KeyRound size={22} />
            <div><h2>비밀번호 확인</h2><p>회원정보 수정을 위해 현재 비밀번호를 입력해주세요.</p></div>
          </div>
          <label className="form-field account-verify-id"><span>아이디</span><input value={account.loginId ?? ""} disabled /></label>
          <label className="form-field"><span>현재 비밀번호</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordVerificationError(""); }} /></label>
          <button type="submit" className="button button--secondary" disabled={isWorking || Boolean(editToken)}>
            <ShieldCheck size={18} />
            {editToken ? "확인 완료" : "로그인 하기"}
          </button>
          {passwordVerificationError && <InlineAlert type="error">{passwordVerificationError}</InlineAlert>}
          {editToken && <InlineAlert type="success">10분 동안 개인정보 수정과 탈퇴가 가능합니다.</InlineAlert>}
        </form>

        <form className="content-card settings-card settings-card--wide" onSubmit={saveAccount}>
          <div className="settings-card__title">
            <FileText size={22} />
            <div><h2>회원 정보 수정</h2><p>전화번호나 비밀번호를 변경할 수 있습니다.</p></div>
          </div>
          <div className="form-grid form-grid--two">
            <label className="form-field"><span>닉네임</span><input value={publicForm.nickname} maxLength={12} onChange={(event) => setPublicForm((current) => ({ ...current, nickname: event.target.value }))} /><small className={nicknameValid ? "field-message--success" : "field-message--error"}>{nicknameValid ? "✓ 사용 가능한 닉네임입니다." : "X 닉네임은 2~12자로 입력해주세요."}</small></label>
            <label className="form-field"><span>현재 비밀번호</span><input type="password" value={currentPassword} disabled /></label>
            <label className="form-field"><span>새 비밀번호</span><input type="password" autoComplete="new-password" value={accountForm.newPassword} onChange={(event) => setAccountForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="변경하지 않으면 비워두세요" />{accountForm.newPassword && <small className={newPasswordValid ? "field-message--success" : "field-message--error"}>{newPasswordValid ? "✓ 영문·숫자·특수문자 중 2가지 이상 조합(8~20자)" : "X 영문·숫자·특수문자 중 2가지 이상 조합(8~20자)"}</small>}</label>
            <label className="form-field"><span>새 비밀번호 확인</span><input type="password" autoComplete="new-password" value={accountForm.newPasswordConfirm} onChange={(event) => setAccountForm((current) => ({ ...current, newPasswordConfirm: event.target.value }))} />{accountForm.newPasswordConfirm && <small className={newPasswordMatches ? "field-message--success" : "field-message--error"}>{newPasswordMatches ? "✓ 비밀번호가 일치합니다." : "X 비밀번호가 일치하지 않습니다."}</small>}</label>
            <label className="form-field account-phone-field"><span>전화번호</span><div className="field-inline"><input value={accountForm.phone} onChange={(event) => { setAccountForm((current) => ({ ...current, phone: event.target.value })); setPhoneVerified(false); }} /><button type="button" className="button button--small" disabled={!editToken || isWorking} onClick={sendPhoneCode}>휴대폰 인증</button></div></label>
            {phoneVerificationId && !phoneVerified && <label className="form-field"><span>인증번호</span><div className="field-inline"><input value={phoneCode} maxLength={6} placeholder="인증번호를 입력해주세요" onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ""))} /><button type="button" className="button button--small" onClick={verifyPhoneCode}>확인</button></div></label>}
            <label className="form-field"><span>이메일</span><input type="email" value={accountForm.email} onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))} /></label>
          </div>
          <InlineAlert>비밀번호 변경 시 다시 로그인해야 합니다.</InlineAlert>
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
              <button type="button" className="button button--danger button--small" onClick={() => setLogoutAllOpen(true)}>모든 기기 로그아웃</button>
            </div>
          )}
        </section>

        <section className="content-card settings-card danger-zone settings-card--wide">
          <div className="settings-card__title"><Trash2 size={22} /><div><h2>회원 탈퇴</h2><p>탈퇴하면 진행 중 거래와 경매 상태가 정리됩니다.</p></div></div>
          <button type="button" className="button button--danger" disabled={!editToken} onClick={() => setWithdrawOpen(true)}><Trash2 size={18} />회원 탈퇴</button>
        </section>
      </div>
      <Modal
        open={logoutAllOpen}
        title="모든 기기 로그아웃"
        description="현재 기기를 포함한 모든 로그인 세션을 종료합니다."
        onClose={() => setLogoutAllOpen(false)}
        footer={(
          <>
            <button type="button" className="button button--secondary" onClick={() => setLogoutAllOpen(false)}>취소</button>
            <button type="button" className="button button--danger" onClick={logoutAll}>모두 로그아웃</button>
          </>
        )}
      />
      <Modal
        open={withdrawOpen}
        title="회원 탈퇴"
        description="정말 탈퇴하시겠습니까?"
        onClose={() => setWithdrawOpen(false)}
        footer={(
          <>
            <button type="button" className="button button--secondary" onClick={() => setWithdrawOpen(false)}>취소</button>
            <button type="button" className="button button--danger" onClick={withdraw}>탈퇴하기</button>
          </>
        )}
      />
    </div>
  );
}
