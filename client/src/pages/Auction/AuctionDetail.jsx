import React, { useEffect, useState } from 'react'

export default function AuctionDetail({ listingIdx, isLogin }) {
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 기본은 첫 번째 이미지
  const [currentImage, setCurrentImage] = useState('')

  // 실시간 남은 시간
  const [timeLeft, setTimeLeft] = useState('23:59:59')

  // 경매 종료 여부
  const [isEnded, setIsEnded] = useState(false)

  // 상세 데이터 불러오기
  useEffect(() => {
    fetch(`http://127.0.0.1:8080/api/auctions/${listingIdx}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setAuction(result.data)
          // 데이터가 오면 첫 번째 이미지를 기본 대표 이미지로 설정
          if (result.data.images && result.data.images.length > 0) {
            setCurrentImage(result.data.images[0])
          }
        } else {
          setErrorMsg(result.message || "정보를 불러오지 못했습니다.")
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("상세 조회 실패:", err)
        setErrorMsg("서버 통신 중 에러가 발생했습니다.")
        setLoading(false)
      })
  }, [listingIdx])

  // 3. 실시간 1일(24시간) 카운트다운 타이머 로직 예시
  useEffect(() => {
    // 예시 마감 시간 (경매 등록일로부터 24시간 뒤라고 가정)
    const targetTime = new Date().getTime() + 24 * 60 * 60 * 1000

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = targetTime - now

      if (distance < 0) {
        setTimeLeft("00:00:00")
        clearInterval(timer)
      } else {
        const hours = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0')
        const minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0')
        const seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0')
        setTimeLeft(`${hours} : ${minutes} : ${seconds}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 입찰하기 전송 함수
  const handleBidSubmit = (e) => {
    e.preventDefault()
    if (!isLogin) {
      alert("로그인이 필요한 서비스입니다.")
      return
    }
    if (isEnded) {
      alert("경매가 종료되었습니다.")
      return
    }
    console.log("입찰 금액:", bidAmount)
  }

  if (loading) return <div>로딩 중...</div>
  if (errorMsg) return <div>에러: {errorMsg}</div>
  if (!auction) return <div>상품 정보가 없습니다.</div>

  // 임시 이미지 배열
  const images = auction.images || ['이미지1', '이미지2', '이미지3', '이미지4']

  return (
    <div>
      {isEnded && (
        <div>
          경매가 종료되었습니다.
        </div>
      )}
      <div>
        <span>경매장</span> &gt; <span>{auction.category}</span> &gt; <span>{auction.subCategory}</span>
      </div>

      <div>
        <div>
          <div>
            <div>
              <img src={currentImage} alt="대표 이미지"/>
            </div>

            <div>
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setCurrentImage(img)}>
                  {img}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div>판매자 프로필 이미지</div>
            <div>
              <h4>{auction.sellerName}</h4>
              <p>평점: {auction.sellerRating} ({auction.sellerReviewCount})</p>
            </div>
            <button>판매자 프로필</button>
          </div>
        </div>

        <div>
          <div>
            <span>{auction.category}</span>
            <span>❤️ {auction.likes}</span>
          </div>
          <h2>{auction.title}</h2>
          <p>{auction.condition}</p>
          {/* { 컴포넌트 사용해서 페이지 하나로 구현  
            canDelete
            && <p>delete</p>
          } */}

          <div>
            <div>
              <p>현재 입찰가</p>
              <h3>{auction.currentPrice?.toLocaleString()}원</h3>
              <p>시작가 {auction.startPrice?.toLocaleString()}원 | 입찰 횟수 {auction.bidCount}회</p>
            </div>
            <div>
              <p>마감까지</p>
              <div>{timeLeft}</div>
              <span>{auction.endTime} 마감</span>
            </div>
          </div>

          <div>
            <button disabled={!isLogin}>
              {isLogin ? "관심 상품 등록" : "관심 상품 등록 (로그인 필요)"}
            </button>
            <button disabled={!isLogin}>
              {isLogin ? "채팅하기" : "채팅하기 (로그인 필요)"}
            </button>
          </div>

          <form onSubmit={handleBidSubmit}>
            <input 
              type="number" 
              placeholder="입찰가 입력" 
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              disabled={!isLogin}
            />
            <span>원</span>
            <button type="submit" disabled={!isLogin}>
              {isLogin ? "전송하기" : "비로그인"}
            </button>
          </form>

          <div>
            <h4>입찰 현황 ({auction.bidCount}건)</h4>
            <table>
              <thead>
                <tr>
                  <th>입찰자</th>
                  <th>입찰가</th>
                  <th>입찰시간</th>
                </tr>
              </thead>
              <tbody>
                {auction.topBids?.map((bid, index) => (
                  <tr key={index}>
                    <td>{index === 0 ? '👑 ' : ''}{bid.username}</td>
                    <td>{bid.price?.toLocaleString()}원</td>
                    <td>{bid.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div>
              <span>내 입찰</span>
              <span>{auction.myBid ? `${auction.myBid.price?.toLocaleString()}원` : '-'}</span>
              <span>{auction.myBid ? auction.myBid.time : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3>상품 설명</h3>
        <hr />
        <div>
          <p>{auction.description}</p>
        </div>
      </div>

      <div>
        <button onClick={onBack}>목록으로</button>
      </div>
    </div>
  )
}