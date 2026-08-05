import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation, Navigate } from "react-router"

import {
  Gavel,
  Package,
  ClipboardList,
  Pencil,
  Heart,
  ArrowUpRight,
  ShoppingCart,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { usersApi } from "../../api/usersApi";
import USER_ROLE from "../../constants/userRole";
import Button from "../../components/button/Button.jsx";
import RatingStar from "../../components/input/RatingStar.jsx";
import ListingsTab from "./tabs/ListingsTab.jsx";
import HistoryTab from "./tabs/HistoryTab.jsx";
import ReviewsTab from "./tabs/ReviewsTab.jsx";
import FavoritesTab from "./tabs/FavoritesTabs.jsx"
import "./MyPage.css";

const formatRating = (averageRating) => (averageRating > 0 ? averageRating.toFixed(1) : "-");

// 마이페이지 탭
// 본인 마이페이지는 4개 탭 전부, 상대방 프로필은 판매상품/거래후기만 노출한다.
// (docs F. 마이페이지 - 6. 노출 정책: 관심목록/거래내역은 개인정보이므로 비공개)
const TAB_DEFS = [
  {
    key: "listings",
    icon: Package,
    ownerOnly: false,
    label: (isMyPage) => (isMyPage ? "내가 등록한 상품" : "판매 상품"),
  },
  {
    key: "history",
    icon: ClipboardList,
    ownerOnly: true,
    label: () => "거래 내역",
  },
  {
    key: "reviews",
    icon: Pencil,
    ownerOnly: false,
    label: () => "거래 후기",
  },
  {
    key: "favorites",
    icon: Heart,
    ownerOnly: true,
    label: () => "관심 목록",
  },
];


export default function MyPage() {

  // URL: /mypage/:id
  const { id } = useParams()

  const navigate = useNavigate()
  const location = useLocation()

  const { user } = useAuth()

  // 현재 로그인한 사용자와 페이지의 사용자가 같은지 확인
  const isMyPage = String(user?.id) === String(id)
  const tabs = TAB_DEFS.filter((tab) => isMyPage || !tab.ownerOnly)

  const [activeTab, setActiveTab] = useState(tabs[0].key)
  const [profile, setProfile] = useState(null)


  // 다른 사용자의 페이지로 이동하는 등 id가 바뀌면 숨겨지는 탭이 남아있지 않도록 리셋
  // (렌더링 도중 state를 조정하는 React 권장 패턴: effect로 하면 한 프레임 늦게 반영됨)
  const [resetKey, setResetKey] = useState(id)

  if (resetKey !== id) {
    setResetKey(id)
    setActiveTab("listings")
  }


  // 공개 프로필(닉네임/소개글/아바타/통계) 조회
  useEffect(() => {
    if (!id) return

    let cancelled = false

    function fetchProfile() {
      setProfile(null)

      usersApi
        .getProfile(id)
        .then((res) => {
          if (cancelled) return
          setProfile(res.data)
        })
        .catch(() => {
          // 프로필 조회 실패는 부가 정보라 화면 전체를 에러로 덮지 않고 placeholder 유지
        })
    }

    fetchProfile()

    return () => {
      cancelled = true
    }
  }, [id])

  // averageRating은 10점 만점 원본 → UI는 5점 별점 기준으로 환산
  const displayRating = profile ? profile.averageRating / 2 : 0

  // 관리자가 자기 자신의 마이페이지로 들어오면 관리자 페이지로 보낸다.
  // (다른 사람의 공개 프로필을 보는 것은 그대로 허용)
  if (isMyPage && user?.role === USER_ROLE.ADMIN) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="mypage">

      {/* =========================================
          사이드바
      ========================================== */}

      <aside className="mypage-sidebar">

        {/* =====================================
            프로필 카드
        ====================================== */}

        <div className="mypage-profile-card">

          {/* 프로필 이미지 */}
          <div
            className="mypage-avatar"
            style={
              profile?.profileImageUrl
                ? { backgroundImage: `url(${profile.profileImageUrl})` }
                : undefined
            }
          >
            {!profile?.profileImageUrl && <Gavel size={32} />}
          </div>


          {/* 닉네임 */}
          <p className="mypage-nickname">
            {profile?.nickname ?? user?.nickname ?? id}
          </p>


          {/* 소개 */}
          <p className="mypage-subtitle">
            {profile?.bio || "소개글이 없습니다."}
          </p>


          {/* 자신의 마이페이지일 때만 수정 버튼 */}
          {isMyPage && (
            <div className="mypage-profile-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/mypage/${id}/editprofile`, {
                    state: {
                      backgroundLocation: location,
                    }
                  })}>
                <Pencil size={16} />
                프로필 수정
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/mypage/${id}/edituser`, {
                    state: {
                      backgroundLocation: location,
                    }
                  })
                }
              >
                <Pencil size={16} />
                회원 정보 수정
              </Button>
            </div>
          )}

        </div>


        {/* =====================================
            탭 + 통계 카드
        ====================================== */}

        <div className="mypage-tabs-card">

          <ul className="mypage-tabs">

            {tabs.map(
              ({ key, label, icon: Icon }) => (
                <li key={key}>

                  <button
                    className={
                      activeTab === key
                        ? "mypage-tab-active"
                        : "mypage-tab"
                    }
                    onClick={() => setActiveTab(key)}
                  >
                    <Icon size={16} />
                    {label(isMyPage)}
                  </button>

                </li>
              )
            )}

          </ul>


          {/* 통계 (판매/구매 건수, 평균 평점) */}
          <div className="mypage-stats">

            <div className="mypage-stats-row">

              <div className="mypage-stat">
                <div className="mypage-stat-icon mypage-stat-icon-sell">
                  <ArrowUpRight size={16} />
                </div>
                <div className="mypage-stat-value">{profile ? profile.sellCount : "-"}</div>
                <div className="mypage-stat-label">판매</div>
              </div>

              <div className="mypage-stat">
                <div className="mypage-stat-icon mypage-stat-icon-buy">
                  <ShoppingCart size={16} />
                </div>
                <div className="mypage-stat-value">{profile ? profile.buyCount : "-"}</div>
                <div className="mypage-stat-label">구매</div>
              </div>

            </div>

            <div className="mypage-rating">
              <div className="mypage-rating-label">평균 평점</div>
              <div className="mypage-rating-value">{formatRating(displayRating)}</div>
              <RatingStar rating={displayRating} size={16} />
            </div>

          </div>

        </div>

      </aside>

      <section className="mypage-content">

        {/* 내가 등록한 상품 / 판매 상품 */}
        {activeTab === "listings" && (
          <ListingsTab
            userIdx={id}
            isMyPage={isMyPage}
            title={isMyPage ? "내가 등록한 상품" : `${profile?.nickname ?? id}님의 판매 상품`}
          />
        )}

        {/* 거래 내역 (본인 전용) */}
        {activeTab === "history" && isMyPage && <HistoryTab />}

        {/* 거래 후기 */}
        {activeTab === "reviews" && (
          <ReviewsTab userId={id} isMyPage={isMyPage} />
        )}

        {/* 관심 목록 (본인 전용) */}
        {activeTab === "favorites" && isMyPage && <FavoritesTab />}

      </section>

    </div>
  );
}
