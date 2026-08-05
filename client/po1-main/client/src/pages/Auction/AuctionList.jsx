import React, { useState, useEffect } from "react";

export default function auctionList() {
    const [auctions, setAuctions] = useState([])
    const [loding, setLoding] = useState(true)

    const [keyword, setKeyword] = useState('')
    const [category, setCategory] = useState('전체')
    const [sort, setSort] = useState('latest')
    const [page, setPage] = useState(1)

    const categories = ['전체', '의류', '전자기기', '뷰티', '반려동물 용품', '도서', '액세서리', '신발', '헬스']
    const fetchAuctions = (currentCategory, currentSort, currentKeyword, currentPage) => {
        setLoading(true)

        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: 16,
            sort: currentSort,
            ...(currentKeyword && { keyword: currentKeyword }),
            ...(currentCategory && currentCategory !== '전체' && { category: currentCategory })
        })

        // 본인 백엔드 포트번호로 변경하세요!
        fetch(`http://127.0.0.1:8080/api/auctions?${queryParams}`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    setAuctions(result.data)
                }
                setLoading(false)
            })
            .catch(err => {
                console.error("데이터 로딩 실패:", err)
                setLoading(false)
            })
    }

    // 카테고리나 정렬, 페이지가 바뀔 때
    useEffect(() => {
        fetchAuctions(category, sort, keyword, page)
    }, [category, sort, page])

    // 카테고리 버튼을 눌렀을 때
    const handleCategoryClick = (selectedCat) => {
        setCategory(selectedCat)
        setKeyword('') // 카테고리 바꾸면 검색어는 초기화 (필요시 유지해도 됨)
        setPage(1)
    }

    // 검색을 했을 때 카테고리 누른 상태로 검색해도 전체에서 검색
    const handleSearch = (e) => {
        e.preventDefault()
        setCategory('전체') //
        setPage(1)

        // 강제로 전체 카테고리 상태와 현재 검색어로 즉시 조회
        fetchAuctions('전체', sort, keyword, 1)
    }

    return (
    <div>
      <div>
        <div>
          <h1>경매장</h1>
          <p>다양한 물건을 확인하고 입찰해보세요</p>
        </div>
        <button>경매 글 작성하기</button>
      </div>

      <form onSubmit={handleSearch}>
        <input 
          type="text" 
          placeholder="찾고싶은 물건을 검색해보세요" 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit">검색</button>
      </form>

      <div>
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={category === cat ? 'active' : ''}
          >
            {cat}
          </button>
        ))}
      </div>

      <div>
        <h3>경매장 상품 ({auctions.length}개)</h3>
        <div>
          <button onClick={() => setSort('latest')}>최신순</button>
          <button onClick={() => setSort('popular')}>인기순</button>
          <button onClick={() => setSort('closing')}>마감 임박</button>
        </div>
      </div>

      {loading ? (
        <div>상품 불러오는 중...</div>
      ) : auctions.length === 0 ? (
        <div>등록된 상품이 없습니다.</div>
      ) : (
        <div>
          {auctions.map(item => (
            <div key={item.listingIdx}>
              <div>상품 이미지</div>
              <span>{item.category}</span>
              <h4>{item.title}</h4>
              <p>{item.startPrice?.toLocaleString()}원</p>
              <div>
                <span>{item.timeRemaining || '2분 전'}</span>
                <span>❤️ {item.likes || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
