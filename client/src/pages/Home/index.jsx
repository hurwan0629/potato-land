import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import ProductCard from '../../components/list/ProductCard'

export default function Home() {
  const navigate = useNavigate()
  const [mainData, setMainData] = useState(null)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    fetch('http://localhost:8081/api/main')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMainData(result.data)
      })
      .catch((err) => console.error('API Fetch Error:', err))
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchInput.trim()) {
      navigate(`/search?search=${encodeURIComponent(searchInput)}`)
    }
  }

  if (!mainData) return <div style={{ padding: '80px', textAlign: 'center' }}>로딩중...</div>

  return (
    <div className="home-container">
      {/* 히어로 배너 영역 */}
      <section className="hero-banner">
        <div className="hero-content">
          <h1 className="hero-title">오늘의 감자를 찾아보세요</h1>
          <p className="hero-subtitle">
            필요한 물건은 합리적으로,<br />
            특별한 물건은 경매로 만나보세요!
          </p>

          {/* 바로가기 버튼 2개 */}
          <div className="shortcut-btn-group">
            <button
              className="shortcut-btn btn-used"
              onClick={() => navigate('/search')}
            >
              <span></span> 중고거래 바로가기
            </button>
            <button
              className="shortcut-btn btn-auction"
              onClick={() => navigate('/auction')}
            >
              <span></span> 경매장 바로가기
            </button>
          </div>
        </div>

        {/* 히어로 감자 그래픽 */}
        <div className="hero-graphic">
          <span className="big-potato-emoji">🥔🔍</span>
        </div>
      </section>

      {/* 중고거래 인기순 섹션 */}
      <section className="product-section">
        <h2 className="section-title">중고거래 인기순</h2>
        <div className="product-grid">
          {mainData.usedPopular.map((item, index) => (
            <ProductCard
              key={`used-${index}`}
              item={item}
              onClick={() => navigate(`/products/${item.listingIdx}`)}
            />
          ))}
        </div>
      </section>

      {/* 경매장 인기순 섹션 */}
      <section className="product-section">
        <h2 className="section-title">경매장 인기순</h2>
        <div className="product-grid">
          {mainData.auctionPopular.map((item, index) => (
            <ProductCard
              key={`auction-${index}`}
              item={item}
              onClick={() => navigate('/auction')}
            />
          ))}
        </div>
      </section>

      {/* 최근 등록 상품 섹션 */}
      <section className="product-section">
        <h2 className="section-title">최근 등록 상품</h2>
        <div className="product-grid">
          {mainData.recentListings.map((item, index) => (
            <ProductCard
              key={`recent-${index}`}
              item={item}
              onClick={() => navigate(`/products/${item.listingIdx}`)}
            />
          ))}
        </div>
      </section>

      {/* 경매장 마감 임박 순 섹션 */}
      <section className="product-section">
        <h2 className="section-title">경매장 마감 임박 순</h2>
        <div className="product-grid">
          {mainData.auctionClosingSoon.map((item, index) => (
            <ProductCard
              key={`closing-${index}`}
              item={item}
              onClick={() => navigate('/auction')}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
