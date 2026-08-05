import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'

export default function ProductDetail() {
  const { id } = useParams() // URL의 상품 ID (테스트한 아이디: /products/101)
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth() // 로그인 상태

  const [item, setItem] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteComplete, setShowDeleteComplete] = useState(false)

  // 상품 상세 정보 조회
  useEffect(() => {
    fetch(`http://localhost:8081/api/used/${id}`, {
      headers: {
        'x-user-idx': isAuthenticated && user ? user.id : ''
      }
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setItem(result.data.item)
          // 로그인한 유저 PK와 판매자 PK가 같거나 백엔드판단 isOwner 적용
          setIsOwner(result.data.isOwner || (user && user.id === result.data.item.sellerIdx))
        } else {
          alert('존재하지 않거나 삭제된 게시글입니다.')
          navigate('/search')
        }
      })
      .catch((err) => console.error('상세 정보 조회 오류:', err))
  }, [id, isAuthenticated, user, navigate])

  // 관심 등록 클릭 핸들러 (비로그인 시 즉시 /login 이동)
  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setIsFavorite(!isFavorite)
    if (item) {
      setItem((prev) => ({
        ...prev,
        favoriteCount: isFavorite ? prev.favoriteCount - 1 : prev.favoriteCount + 1
      }))
    }
  }

  // 채팅하기 클릭 핸들러 (비로그인 시 즉시 /login 이동)
  const handleStartChat = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/chat?listingIdx=${id}`)
  }

  // 수정하기
  const handleEditPost = () => {
    navigate(`/products/register?editId=${id}`)
  }

  // 삭제하기 모달
  const handleOpenDeleteModal = () => {
    setShowDeleteModal(true)
  }

  // 삭제 확정 처리 (DELETE /api/used/:id)
  const handleConfirmDelete = () => {
    fetch(`http://localhost:8081/api/used/${id}`, {
      method: 'DELETE'
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setShowDeleteModal(false)
          setShowDeleteComplete(true)
        }
      })
      .catch((err) => console.error('삭제 처리 오류:', err))
  }

  // 삭제 완료 팝업 확인, 이동
  const handleCloseDeleteComplete = () => {
    setShowDeleteComplete(false)
    navigate('/search') // 삭제 완료 시 중고거래 메인페이지로 바로 이동됨
  }

  const handleNextImage = () => {
    if (item && item.images && item.images.length > 0) {
      setSelectedImageIdx((prev) => (prev + 1) % item.images.length)
    }
  }

  if (!item) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>불러오는 중...</div>
  }

  const images = item.images && item.images.length > 0 ? item.images : [item.thumbnailUrl || '/placeholder.png']

  return (
    <div className="detail-container">
      <main className="content-wrapper">
        <div className="breadcrumb">
          중고거래 &gt; {item.categoryName || item.category || '전체'} &gt; 세부 카테고리명
        </div>

        <div className="main-grid-section">
          {/* 이미지 슬라이더 */}
          <div className="image-gallery-section">
            <div className="main-image-wrapper">
              <img src={images[selectedImageIdx]} alt={item.title} className="main-image" />
              {images.length > 1 && (
                <button className="btn-next-image" onClick={handleNextImage}>
                  &gt;
                </button>
              )}
            </div>

            <div className="thumbnail-list">
              {images.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`썸네일 ${idx}`}
                  className={`sub-thumbnail ${selectedImageIdx === idx ? 'active-thumbnail' : ''}`}
                  onClick={() => setSelectedImageIdx(idx)}
                />
              ))}
            </div>
          </div>

          {/* 우측 상품 정보 */}
          <div className="info-section">
            <div className="category-badge">{item.categoryName || item.category || '중고'}</div>
            <h1 className="item-title">{item.title}</h1>
            <div className="item-price">
              {item.price ? `${item.price.toLocaleString()}원` : '가격 미정'}
            </div>

            <div className="item-meta">
              <span>등록 {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '방금 전'}</span>
              <span>조회 {item.viewCount || 0}</span>
            </div>

            <hr className="divider" />

            <div className="attribute-group">
              <div className="attribute-row">
                <span className="attr-label">상품 상태</span>
                <span className="attr-value">{item.condition || '사용감 적음'}</span>
              </div>
              <div className="attribute-row">
                <span className="attr-label">등록 날짜</span>
                <span className="attr-value">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '2026.07.28'}</span>
              </div>
              <div className="attribute-row">
                <span className="attr-label">거래 희망 장소</span>
                <span className="attr-value">{item.preferredTradeLocation || item.location || '서울시 강남구 역삼동'}</span>
              </div>
            </div>

            <hr className="divider" />

            {/* 판매자 카드 (04.md 명세서 seller 객체 100% 대응) */}
            <div className="seller-card">
              <div className="seller-info-left">
                {item.seller?.profileImageUrl ? (
                  <img src={item.seller.profileImageUrl} alt="프로필" className="seller-avatar-img" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                ) : (
                  <div className="seller-avatar">🥔</div>
                )}
                <div>
                  <div className="seller-nickname">{item.seller?.nickname || item.sellerNickname || '감자마스터'}</div>
                  <div className="seller-rating">★ {item.seller?.averageRating || item.sellerRating || 5.0} (12)</div>
                </div>
              </div>
              <button className="btn-seller-profile">판매자 프로필</button>
            </div>

            {/* 버튼 분기 처리 */}
            <div className="action-button-group">
              {isOwner ? (
                <>
                  <button className="btn-delete" onClick={handleOpenDeleteModal}>
                    삭제하기
                  </button>
                  <button className="btn-edit" onClick={handleEditPost}>
                    수정하기
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`btn-favorite ${isFavorite ? 'active-favorite' : ''}`}
                    onClick={handleToggleFavorite}
                  >
                    <span className="heart-icon">♡</span>
                    <span className="favorite-count">{item.favoriteCount || 0}</span>
                  </button>
                  <button className="btn-chat" onClick={handleStartChat}>
                    채팅하기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 설명 본문 */}
        <section className="description-section">
          <h3 className="desc-section-title">상품 설명</h3>
          <div className="desc-content">{item.description}</div>
        </section>

        <div className="bottom-nav-section">
          <button className="btn-back-to-list" onClick={() => navigate('/search')}>
            목록으로
          </button>
        </div>
      </main>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>✕</button>
            <h4 className="modal-title">게시글 삭제</h4>
            <p className="modal-message">게시글을 삭제하시겠습니까?</p>
            <div className="modal-button-group">
              <button className="btn-modal-cancel" onClick={() => setShowDeleteModal(false)}>취소</button>
              <button className="btn-modal-confirm" onClick={handleConfirmDelete}>삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 완료 모달 */}
      {showDeleteComplete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={handleCloseDeleteComplete}>✕</button>
            <h4 className="modal-title">게시글 삭제</h4>
            <p className="modal-message">게시물이 삭제되었습니다.</p>
            <div className="modal-button-group">
              <button className="btn-modal-confirm" onClick={handleCloseDeleteComplete}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
