import React from 'react'

function ProductCard({ item, onClick, onFavoriteClick }) {
  if (!item) return null
  const isAuction = item.listingType === 'AUCTION'

  return (
    <div className="product-card-container" onClick={onClick}>
      {/* 1. 썸네일 영역 */}
      <div className="product-thumbnail-box">
        {item.thumbnailUrl && (
          <img className="product-thumbnail-img" src={item.thumbnailUrl} alt={item.title} />
        )}

        {/* 카테고리 태그 뱃지 */}
        <div className="product-badge-category">
          <span>{item.categoryName || item.category || '기타'}</span>
        </div>

        {/* 경매 뱃지: 내가 입찰 중인 게시물 */}
        {isAuction && item.isBidByMe && (
          <div className="product-badge-mybid">입찰 중</div>
        )}

        {/* 경매 뱃지: 마감 임박 뱃지 */}
        {isAuction && item.isClosingSoon && (
          <div className="product-badge-closingsoon">마감 임박</div>
        )}

        {/* 경매 남은 입찰 시간 */}
        {isAuction && item.endsAt && (
          <div className="product-remaining-time">{item.endsAt}</div>
        )}
      </div>

      {/* 2. 상품 정보 영역 */}
      <div className="product-card-title">{item.title}</div>
      <div className="product-card-price">
        {item.price ? `${item.price.toLocaleString()}원` : ''}
      </div>

      <div className="product-card-footer">
        <span className="product-card-time">{item.createdAt || '방금 전'}</span>
        
        {/* 하트 아이콘 및 찜 개수 */}
        <div className="product-favorite-area" onClick={(e) => onFavoriteClick && onFavoriteClick(e, item.listingIdx)}>
          <span className="product-favorite-count">{item.favoriteCount || 0}</span>
          <span className="product-heart-icon">♡</span>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
