import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import ProductCard from '../../components/list/ProductCard'
import Pagination from '../../components/list/Pagination'

export default function Auction() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()

  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [sort, setSort] = useState('recent') // 'recent' | 'popular' | 'closingSoon'
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // 카테고리 목록 조회
  useEffect(() => {
    fetch('http://localhost:8081/api/categories')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setCategories(result.data.items || result.data.categories || [])
      })
      .catch((err) => console.error('카테고리 조회 오류:', err))
  }, [])

  // 경매 목록 조회
  useEffect(() => {
    setLoading(true)
    const queryParams = new URLSearchParams({
      category: selectedCategory,
      search: activeSearch,
      sort: sort,
      page: currentPage
    })

    fetch(`http://localhost:8081/api/auctions?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setItems(result.data.items)
          setTotalCount(result.data.totalCount)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('경매 목록 조회 오류:', err)
        setLoading(false)
      })
  }, [selectedCategory, activeSearch, sort, currentPage])

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName)
    setCurrentPage(1)
  }

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault()
    setActiveSearch(searchInput)
    setSelectedCategory('전체')
    setCurrentPage(1)
  }

  const handleSortChange = (newSort) => {
    setSort(newSort)
    setCurrentPage(1)
  }

  const handleCreateAuction = () => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    navigate('/products/register')
  }

  const handleItemClick = (listingIdx) => {
    navigate(`/products/${listingIdx}`)
  }

  const handleToggleFavorite = (e, listingIdx) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
  }

  const totalPages = Math.ceil(totalCount / 8) || 1

  return (
    <div className="auction-main-container">
      <main className="content-wrapper">
        <div className="top-header-section">
          <div>
            <h1 className="page-title">경매장</h1>
            <p className="page-subtitle">다양한 물건을 확인하고 입찰해보세요</p>
          </div>
          <button className="btn-create" onClick={handleCreateAuction}>
            경매 글 작성하기
          </button>
        </div>

        {/* 검색창 & 카테고리 필터 카드 */}
        <div className="search-and-category-box">
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <div className="search-input-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="찾고 싶은 물건을 검색해보세요"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-search">검 색</button>
          </form>

          <div className="category-tag-list">
            <button
              className={`tag-btn ${selectedCategory === '전체' ? 'active-tag' : ''}`}
              onClick={() => handleCategorySelect('전체')}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat.idx}
                className={`tag-btn ${selectedCategory === cat.name ? 'active-tag' : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 정보 & 3개 정렬 탭 (최신순 / 인기순 / 마감 임박) */}
        <div className="list-header-section">
          <div className="count-text">
            {activeSearch ? (
              <span>'<strong>{activeSearch}</strong>'에 대한 검색 결과 {totalCount}개</span>
            ) : (
              <span>경매장 상품 {totalCount}개</span>
            )}
          </div>
          <div className="sort-tab-group">
            <button
              className={`sort-btn ${sort === 'recent' ? 'active-sort' : ''}`}
              onClick={() => handleSortChange('recent')}
            >
              최신순
            </button>
            <button
              className={`sort-btn ${sort === 'popular' ? 'active-sort' : ''}`}
              onClick={() => handleSortChange('popular')}
            >
              인기순
            </button>
            <button
              className={`sort-btn ${sort === 'closingSoon' ? 'active-sort' : ''}`}
              onClick={() => handleSortChange('closingSoon')}
            >
              마감 임박
            </button>
          </div>
        </div>

        {/* 상품 카드 리스트 OR 검색 결과 없음 */}
        {loading ? (
          <div className="loading-text">불러오는 중...</div>
        ) : items.length > 0 ? (
          <div className="product-grid">
            {items.map((item) => (
              <ProductCard
                key={item.listingIdx}
                item={item}
                onClick={() => handleItemClick(item.listingIdx)}
                onFavoriteClick={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="no-result-box">
            <div className="no-result-icon">🔍</div>
            <div className="no-result-text">
              '{activeSearch || selectedCategory}'에 대한 검색 결과가 없습니다.
            </div>
          </div>
        )}

        {/* 팀 공용 Pagination 컴포넌트 재사용 */}
        {items.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </main>
    </div>
  );
}
