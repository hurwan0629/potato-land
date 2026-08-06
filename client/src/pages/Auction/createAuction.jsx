import React, { useState } from "react";

const CATEGORIES = [
    { id: '1', name: '의류' },
    { id: '2', name: '전자기기' },
    { id: '3', name: '뷰티' },
    { id: '4', name: '반려동물 용품' },
    { id: '5', name: '도서' },
    { id: '6', name: '악세사리' },
    { id: '7', name: '신발' },
    { id: '8', name: '헬스' }
]

const ITEM_STATUSES = [
    { value: 'GOOD', name: '사용감 적음' },
    { value: 'NORMAL', name: '사용감 있음' },
    { value: 'BAD', name: '사용감 많음' },
    { value: "NEW", name: '새 상품' }
]

export default function AuctionCreate() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [categoryIdx, setCategoryIdx] = useState('1')
    const [startPrice, setStartPrice] = useState('')
    const [itemStatus, setItemStatus] = useState('GOOD')
    const [images, setImages] = useState([])
    const [preferredTradeLocation, setPreferredTradeLocation] = useState('')

    // 메뉴창 열기 전 상태
    const [isDropdownOpen, setIsDropdownOpen] = useState('false')
    const [isCategoryOpen, setIsCategoryOpen] = useState('false')
    const [isItemStatus, setIsItemStatus] = useState('false')

    // gpt 코드 더 공부해야 함/images
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files)
        if (files.length + images.length > 4) {
            alert('이미지는 최대 4장까지 업로드 가능합니다.')
            return
        }
        setImages((prev) => [...prev, ...files])
    }

    const handleCreate = async (e) => {
        e.preventDefault()

        if (!title || !description || !category || startPrice) {
            alert('제목, 설명, 카테고리, 시작가격은 필수 입력입니다.')
            return
        }

        // 이미지 파일 포함이므로 formData 사용
        const formData = new FormData()
        formData.append('title', title)
        formData.append('description', description)
        formData.append('categoryIdx', categoryIdx)
        formData.append('startPrice', startPrice)
        formData.append('preferredTradeLocation', preferredTradeLocation)
        formData.append('itemStatus', itemStatus)

        // gpt 코드임 / 더 공부해야함 / 각각 꺼내기
        images.forEach((file) => {
            formData.append('images', file);
        })

        try {
            // post 요청
            const response = await fetch('http://localhost:8080/api/auctions', {
                method: 'POST',
                // credentials: 'include', // 토큰
                body: formData,
            })
            const data = await response.json()

            if (response.ok && data.success) {
                alert('경매 글이 등록되었습니다.')
                console.log(data)
                setTitle('')
                setDescription('')
                setCategory('1')
                setItemStatus('GOOD')
                setStartPrice('')
                setPreferredTradeLocation('')
                setImages([])
            } else {
                alert('등록 실패')
            }
        } catch (error) {
            console.error(error)
            alert('서버와 통신 불가')
        }

        // 현재 선택된 값에 맞는 이름을 찾아주는 함수 / gpt
        const currentCategoryName = CATEGORIES.find((cat) => cat.id === categoryIdx)?.name || '의류';
        const currentStatusName = ITEM_STATUSES.find((status) => status.value === itemStatus)?.name || '사용감 적음';

        return (

            <div>
                <h2><strong>경매 물품 등록</strong></h2>
                <p>판매할 상품 정보를 입력해주세요</p>

                <div>
                    <button type="button" onClick={() => setIsWritingTypeOpen(!isWritingTypeOpen)}>
                        경매 물품 등록 ▾
                    </button>

                    {isDropdownOpen && (
                        <div>
                            <button type="button" onClick={() => alert('중고 거래 등록 페이지로 이동(미구현)')}>
                                중고 거래 등록
                            </button>
                            <button type="button" onClick={() => setIsWritingTypeOpen(false)}>
                                경매 물품 등록
                            </button>
                        </div>
                    )}
                </div>
                <form onSubmit={handleCreate}>
                    <div>
                        <h3>상품 정보</h3>
                        <div>
                            <label>상품명</label>
                            <input type="text"
                                placeholder="상품명을 입력해 주세요"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <div>
                                <label>카테고리</label>
                                <button type="button" onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
                                    {'의류'} ▾
                                </button>
                                {isCategoryOpen && (
                                    <div>
                                        {CATEGORIES.map((cat) => (
                                            <div
                                                key={cat.id}
                                                onClick={() => {
                                                    setCategoryIdx(cat.id)
                                                    setIsCategoryOpen(false)
                                                }}
                                            >
                                                {cat.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label>상품 상태</label>
                                <button type="button" onClick={() => setIsStatusOpen(!isStatusOpen)}>
                                    {'사용감 적음'} ▾
                                </button>
                                {isStatusOpen && (
                                    <div>
                                        {ITEM_STATUSES.map((status) => (
                                            <div
                                                key={status.value}
                                                onClick={() => {
                                                    setItemStatus(status.value);
                                                    setIsStatusOpen(false);
                                                }}
                                            >
                                                {status.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label>경매 시작 가격</label>
                            <input
                                type="number"
                                placeholder="가격을 입력해 주세요"
                                value={startPrice}
                                onChange={(e) => setStartPrice(e.target.value)} />
                        </div>
                        <div>
                            <label>상품 이미지<span>최대 4장</span></label>
                            <div>
                                <label>
                                    + 사진 추가
                                    <input type="file" multiple onChange={handleImageChange} />
                                </label>
                                {images.map((img, idx) => (
                                    <div key={idx}>
                                        <img src={URL.createObjectURL(img)} alt="preview" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label>상품 설명</label>
                            <textarea
                                placeholder="상품의 상태, 구매 시기, 구성품등을 자세히 적어주세요"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div>
                            <label>거래 희망 지역</label>
                            <input
                                type="text"
                                placeholder="예: 서울시 강남구 역삼동"
                                value={preferredTradeLocation}
                                onChange={(e) => setPreferredTradeLocation(e.target.value)} />
                        </div>
                    </div>
                </form >
                <div>
                    <button type="button">취소</button>
                    <button type="submit">등록하기</button>
                </div>

            </div >

        )
    }
}