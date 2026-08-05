<<<<<<< HEAD
import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../context/AuthContext'

export default function ProductRegister() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isLoggedIn } = useAuth() // 팀 전역 로그인 상태

  const editId = searchParams.get('editId') // 수정 모드 여부 판별 (editId가 있으면 수정 모드임)

  // 중고거래 폼 상태
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('전자기기')
  const [condition, setCondition] = useState('사용감 적음')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [images, setImages] = useState([])

  // 드롭다운 옵션 목록
  const categoryOptions = ['의류', '전자기기', '뷰티', '반려동물 용품', '도서', '악세사리', '신발', '잡화']
  const conditionOptions = ['새 상품', '사용감 적음', '사용감 있음', '사용감 많음']

  // 비로그인 사용자 즉시 로그인 페이지로
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
    }
  }, [isLoggedIn, navigate])

  // 수정 모드일 때 기존 게시글 데이터 불러와서 폼 채우기
  useEffect(() => {
    if (editId) {
      fetch(`http://localhost:8081/api/used/${editId}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            const data = result.data.item
            setTitle(data.title || '')
            setCategory(data.category || '전자기기')
            setCondition(data.condition || '사용감 적음')
            setPrice(data.price ? String(data.price) : '')
            setLocation(data.location || '')
            setDescription(data.description || '')
            setImages(data.images || [])
          }
        })
        .catch((err) => console.error('기존 데이터 불러오기 오류:', err))
    }
  }, [editId])

  // 이미지 추가 (최대 4장)
  const handleAddImage = () => {
    if (!imageUrlInput.trim()) return
    if (images.length >= 4) {
      alert('이미지는 최대 4장까지 등록할 수 있습니다.')
      return
    }
    setImages([...images, imageUrlInput.trim()])
    setImageUrlInput('')
  }

  // 이미지 삭제
  const handleRemoveImage = (indexToRemove) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove))
  }

  // 폼 제출 (중고거래 글 등록하기 / 수정 완료)
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !price) {
      alert('상품명과 가격을 입력해주세요.')
      return
    }

    const payload = {
      title,
      category,
      price: Number(price),
      condition,
      location,
      description,
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600']
    }

    const url = editId ? `http://localhost:8081/api/used/${editId}` : 'http://localhost:8081/api/used'
    const method = editId ? 'PUT' : 'POST'

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          alert(editId ? '게시글이 성공적으로 수정되었습니다.' : '중고거래 게시글이 성공적으로 등록되었습니다.')
          const targetId = editId || result.data.listingIdx
          navigate(`/products/${targetId}`) // 등록/수정 완료 후 해당 페이지로 이동
        }
      })
      .catch((err) => console.error('저장 처리 오류:', err))
  }

  return (
    <div className="product-register-container">
      <main className="content-wrapper">
        <h1 className="page-title">{editId ? '중고거래 게시글 수정하기' : '중고거래 글 작성하기'}</h1>

        <form onSubmit={handleSubmit} className="register-form">
          {/* 상품명 */}
          <div className="form-group">
            <label className="form-label">상품명</label>
            <input
              type="text"
              className="form-input"
              placeholder="상품명을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* 카테고리 선택 드롭다운 */}
          <div className="form-group">
            <label className="form-label">카테고리</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 상품 상태 선택 드롭다운 */}
          <div className="form-group">
            <label className="form-label">상품 상태</label>
            <select
              className="form-select"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              {conditionOptions.map((cond) => (
                <option key={cond} value={cond}>{cond}</option>
              ))}
            </select>
          </div>

          {/* 판매 가격 */}
          <div className="form-group">
            <label className="form-label">판매 가격 (원)</label>
            <input
              type="number"
              className="form-input"
              placeholder="가격을 입력하세요 (숫자만)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          {/* 거래 희망 지역 */}
          <div className="form-group">
            <label className="form-label">거래 희망 지역</label>
            <input
              type="text"
              className="form-input"
              placeholder="예: 서울시 강남구 역삼동"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* 상품 이미지 등록 (최대 4장) */}
          <div className="form-group">
            <label className="form-label">상품 이미지 (최대 4장)</label>
            <div className="image-input-box">
              <input
                type="text"
                className="form-input"
                placeholder="이미지 URL을 입력하세요"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
              />
              <button type="button" className="btn-add-img" onClick={handleAddImage}>
                추가
              </button>
            </div>

            {/* 등록된 이미지 썸네일 미리보기 */}
            <div className="image-preview-list">
              {images.map((url, idx) => (
                <div key={idx} className="preview-item">
                  <img src={url} alt={`미리보기 ${idx}`} />
                  {idx === 0 && <span className="main-badge">대표</span>}
                  <button type="button" className="btn-remove-img" onClick={() => handleRemoveImage(idx)}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* 상품 설명 */}
          <div className="form-group">
            <label className="form-label">상품 설명</label>
            <textarea
              className="form-textarea"
              rows={6}
              placeholder="상품의 상태, 구매 시기, 하자 유무 등 상세 내용을 적어주세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* 하단 취소 / 등록(수정) 버튼 */}
          <div className="form-button-group">
            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
              취 소
            </button>
            <button type="submit" className="btn-submit">
              {editId ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
=======
export default function ProductRegister() {
  return (
    <div style={{ padding: 40 }}>
      <h2>상품 등록</h2>
      <p>이미지 업로드, 카테고리, 가격, 설명 입력 폼이 들어갈 페이지입니다.</p>
    </div>
  );
>>>>>>> origin/develop
}
