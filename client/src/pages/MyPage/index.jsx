import { useState } from "react";
import { useParams, useNavigate } from "react-router";

import {
  Gavel,
  UserX,
  Coins,
  ShoppingBag,
  Package,
  Pencil,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import Button from "../../components/button/Button.jsx";
import ListItem from "../../components/list/ListItem";
import Pagination from "../../components/list/Pagination";

const MOCK_PRODUCTS = [
  {
    id: 1,
    title: "아이폰 15 프로",
    price: "900,000원",
    status: "판매중",
    createdAt: "2026-08-01",
    listingType: "USED",
  },
  {
    id: 2,
    title: "맥북 에어 M2",
    price: "1,000,000원",
    status: "판매중",
    createdAt: "2026-07-30",
    listingType: "AUCTION",
  },
  {
    id: 3,
    title: "닌텐도 스위치",
    price: "250,000원",
    status: "거래완료",
    createdAt: "2026-07-28",
    listingType: "product",
  },
];


// 마이페이지 탭
const TABS = [
  {
    key: "listings",
    label: "내가 등록한 상품",
    icon: Package,
  },
  {
    key: "history",
    label: "거래 내역",
    icon: Package,
  },
  {
    key: "reviews",
    label: "거래 후기",
    icon: Package,
  },
  {
    key: "favorites",
    label: "관심 목록",
    icon: Package,
  },
];

const ITEMS_PER_PAGE = 5;


export default function MyPage() {

  // URL: /mypage/:id
  const { id } = useParams();

  const navigate = useNavigate();

  const { user } = useAuth();

  const [activeTab, setActiveTab] =
    useState(TABS[0].key);

  const [currentPage, setCurrentPage] =
    useState(1);


  // 현재 로그인한 사용자와
  // 페이지의 사용자가 같은지 확인
  const isMyPage =String(user?.id) === String(id)
  // 현재 페이지에 보여줄 상품
  const startIndex =
    (currentPage - 1) * ITEMS_PER_PAGE;

  const currentProducts =
    MOCK_PRODUCTS.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );


  // 상품 상세 페이지 이동
  const handleProductClick = (product) => {

    if (product.listingType === "auction") {
      navigate(`/auction/${product.id}`);
      return;
    }

    navigate(`/used/${product.id}`);
  };


  return (
    <div className="mypage">

      {/* =========================================
          사이드바
      ========================================== */}

      <aside className="mypage-sidebar">

        {/* 프로필 이미지 */}
        <div className="mypage-avatar">
          <Gavel size={32} />
        </div>


        {/* 닉네임 */}
        <p className="mypage-nickname">
          {user?.nickname ?? id}
        </p>


        {/* 소개 */}
        <p className="mypage-subtitle">
          소개글
        </p>


        {/* =====================================
            프로필 액션
        ====================================== */}

        <div className="mypage-profile-actions">

          {/* 자신의 마이페이지일 때만 수정 버튼 */}
          {isMyPage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                navigate(`/mypage/${id}/editprofile`)
              }
            >
              <Pencil size={16} />
              프로필 수정
            </Button>
          )}
          {isMyPage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                navigate(`/mypage/${id}/edituser`)
              }
            >
              <Pencil size={16} />
              사용자 수정
            </Button>
          )}

        </div>


        {/* =====================================
            탭
        ====================================== */}

        <ul className="mypage-tabs">

          {TABS.map(
            ({ key, label, icon: Icon }) => (
              <li key={key}>

                <button
                  className={
                    activeTab === key
                      ? "mypage-tab-active"
                      : "mypage-tab"
                  }
                  onClick={() => {
                    setActiveTab(key);
                    setCurrentPage(1);
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>

              </li>
            )
          )}

        </ul>


        {/* =====================================
            통계
        ====================================== */}

        <div className="mypage-stats">

          <div className="mypage-stat">

            <div className="mypage-stat-label">
              <Coins size={16} />
              판매
            </div>

            <div className="mypage-stat-value">
              API
            </div>

          </div>


          <div className="mypage-stat">

            <div className="mypage-stat-label">
              <ShoppingBag size={16} />
              구매
            </div>

            <div className="mypage-stat-value">
              API
            </div>

          </div>


          <div className="mypage-rating">

            <div className="mypage-rating-label">
              평균 평점
            </div>

            <div className="mypage-rating-value">
              API
            </div>

          </div>

        </div>

      </aside>
      <section className="mypage-content">

        {/* 내가 등록한 상품 */}
        {activeTab === "listings" && (
          <>

            <h2>
              {isMyPage
                ? "내가 등록한 상품"
                : `${user?.nickname ?? id}님의 상품`}
            </h2>


            <div className="mypage-list">

              {currentProducts.length > 0 ? (

                currentProducts.map(
                  (product) => (

                    <ListItem
                      key={product.id}
                      thumbnail={null}
                      title={product.title}
                      subtitle={product.price}
                      status={product.status}
                      date={product.createdAt}
                      onClick={() =>
                        handleProductClick(product)
                      }
                    />

                  )
                )

              ) : (

                <p>
                  등록된 상품이 없습니다.
                </p>

              )}
              

            </div>


            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(
                MOCK_PRODUCTS.length /
                  ITEMS_PER_PAGE
              )}
              onPageChange={setCurrentPage}
            />

          </>
        )}


        {/* 나머지 탭 */}
        {activeTab !== "products" && (

          <div>
            {
              TABS.find(
                (tab) =>
                  tab.key === activeTab
              )?.label
            }
            화면 준비 중입니다.
          </div>

        )}

      </section>

    </div>
  );
}