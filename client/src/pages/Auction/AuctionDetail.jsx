// import React, { useEffect, useState } from 'react'

// export default function AuctionDetail({ listingIdx, isLogin }) {
//   const [auction, setAuction] = useState(null)
//   const [loading, setLoading] = useState(true)
//   const [bidAmount, setBidAmount] = useState('')
//   const [errorMsg, setErrorMsg] = useState('')

//   // 기본은 첫 번째 이미지
//   const [currentImage, setCurrentImage] = useState('')

//   // 실시간 남은 시간
//   const [timeLeft, setTimeLeft] = useState('23:59:59')

//   // 경매 종료 여부
//   const [isEnded, setIsEnded] = useState(false)

//   // 상세 데이터 불러오기
//   useEffect(() => {
//     fetch(`http://127.0.0.1:8080/api/auctions/${listingIdx}`)
//       .then(res => res.json())
//       .then(result => {
//         if (result.success) {
//           setAuction(result.data)
//           // 데이터가 오면 첫 번째 이미지를 기본 대표 이미지로 설정
//           if (result.data.images && result.data.images.length > 0) {
//             setCurrentImage(result.data.images[0])
//           }
//         } else {
//           setErrorMsg(result.message || "정보를 불러오지 못했습니다.")
//         }
//         setLoading(false)
//       })
//       .catch(err => {
//         console.error("상세 조회 실패:", err)
//         setErrorMsg("서버 통신 중 에러가 발생했습니다.")
//         setLoading(false)
//       })
//   }, [listingIdx])

//   // 3. 실시간 1일(24시간) 카운트다운 타이머 로직 예시
//   useEffect(() => {
//     // 예시 마감 시간 (경매 등록일로부터 24시간 뒤라고 가정)
//     const targetTime = new Date().getTime() + 24 * 60 * 60 * 1000

//     const timer = setInterval(() => {
//       const now = new Date().getTime()
//       const distance = targetTime - now

//       if (distance < 0) {
//         setTimeLeft("00:00:00")
//         clearInterval(timer)
//       } else {
//         const hours = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0')
//         const minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0')
//         const seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0')
//         setTimeLeft(`${hours} : ${minutes} : ${seconds}`)
//       }
//     }, 1000)

//     return () => clearInterval(timer)
//   }, [])

//   // 입찰하기 전송 함수
//   const handleBidSubmit = (e) => {
//     e.preventDefault()
//     if (!isLogin) {
//       alert("로그인이 필요한 서비스입니다.")
//       return
//     }
//     if (isEnded) {
//       alert("경매가 종료되었습니다.")
//       return
//     }
//     console.log("입찰 금액:", bidAmount)
//   }

//   if (loading) return <div>로딩 중...</div>
//   if (errorMsg) return <div>에러: {errorMsg}</div>
//   if (!auction) return <div>상품 정보가 없습니다.</div>

//   // 임시 이미지 배열
//   const images = auction.images || ['이미지1', '이미지2', '이미지3', '이미지4']

//   return (
//     <div>
//       {isEnded && (
//         <div>
//           경매가 종료되었습니다.
//         </div>
//       )}
//       <div>
//         <span>경매장</span> &gt; <span>{auction.category}</span> &gt; <span>{auction.subCategory}</span>
//       </div>

//       <div>
//         <div>
//           <div>
//             <div>
//               <img src={currentImage} alt="대표 이미지"/>
//             </div>

//             <div>
//               {images.map((img, idx) => (
//                 <div 
//                   key={idx} 
//                   onClick={() => setCurrentImage(img)}>
//                   {img}
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div>
//             <div>판매자 프로필 이미지</div>
//             <div>
//               <h4>{auction.sellerName}</h4>
//               <p>평점: {auction.sellerRating} ({auction.sellerReviewCount})</p>
//             </div>
//             <button>판매자 프로필</button>
//           </div>
//         </div>

//         <div>
//           <div>
//             <span>{auction.category}</span>
//             <span>❤️ {auction.likes}</span>
//           </div>
//           <h2>{auction.title}</h2>
//           <p>{auction.condition}</p>
//           {/* { 컴포넌트 사용해서 페이지 하나로 구현  
//             canDelete
//             && <p>delete</p>
//           } */}

//           <div>
//             <div>
//               <p>현재 입찰가</p>
//               <h3>{auction.currentPrice?.toLocaleString()}원</h3>
//               <p>시작가 {auction.startPrice?.toLocaleString()}원 | 입찰 횟수 {auction.bidCount}회</p>
//             </div>
//             <div>
//               <p>마감까지</p>
//               <div>{timeLeft}</div>
//               <span>{auction.endTime} 마감</span>
//             </div>
//           </div>

//           <div>
//             <button disabled={!isLogin}>
//               {isLogin ? "관심 상품 등록" : "관심 상품 등록 (로그인 필요)"}
//             </button>
//             <button disabled={!isLogin}>
//               {isLogin ? "채팅하기" : "채팅하기 (로그인 필요)"}
//             </button>
//           </div>

//           <form onSubmit={handleBidSubmit}>
//             <input 
//               type="number" 
//               placeholder="입찰가 입력" 
//               value={bidAmount}
//               onChange={(e) => setBidAmount(e.target.value)}
//               disabled={!isLogin}
//             />
//             <span>원</span>
//             <button type="submit" disabled={!isLogin}>
//               {isLogin ? "전송하기" : "비로그인"}
//             </button>
//           </form>

//           <div>
//             <h4>입찰 현황 ({auction.bidCount}건)</h4>
//             <table>
//               <thead>
//                 <tr>
//                   <th>입찰자</th>
//                   <th>입찰가</th>
//                   <th>입찰시간</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {auction.topBids?.map((bid, index) => (
//                   <tr key={index}>
//                     <td>{index === 0 ? '👑 ' : ''}{bid.username}</td>
//                     <td>{bid.price?.toLocaleString()}원</td>
//                     <td>{bid.time}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>

//             <div>
//               <span>내 입찰</span>
//               <span>{auction.myBid ? `${auction.myBid.price?.toLocaleString()}원` : '-'}</span>
//               <span>{auction.myBid ? auction.myBid.time : '-'}</span>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div>
//         <h3>상품 설명</h3>
//         <hr />
//         <div>
//           <p>{auction.description}</p>
//         </div>
//       </div>

//       <div>
//         <button onClick={onBack}>목록으로</button>
//       </div>
//     </div>
//   )
// }


import React, { useState, useEffect } from 'react';

const AuctionDetail = ({ listingIdx, currentUser }) => {
  // 데이터 상태 관리
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  // 타이머 및 모달 상태
  const [timeLeft, setTimeLeft] = useState(86400); // 예시: 24시간(초 단위)
  const [isEnded, setIsEnded] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  // 입력 필드 상태
  const [bidAmount, setBidAmount] = useState('');

  // 1. 데이터 페치 (백엔드 연동 부위)
  useEffect(() => {
    // API 호출로 상세 정보 및 입찰 내역을 가져온다고 가정
    // 백엔드에서 탈퇴한 유저(deleted_at IS NULL 등)가 필터링된 데이터가 넘어옴
    fetchAuctionDetail(listingIdx).then((res) => {
      setAuction(res.auction);
      setBids(res.bids);
      setTimeLeft(res.remainingSeconds); // 서버에서 남은 초를 받아온다고 가정
      setLoading(false);
    });
  }, [listingIdx]);

  // 2. 실시간 24시간 카운트다운 타이머
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsEnded(true);
      setShowEndModal(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsEnded(true);
          setShowEndModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

      return () => clearInterval(timer);
  }, [timeLeft]);

  // 남은 시간을 HH:MM:SS 형태로 변환
  const formatTime = (seconds) => {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${hrs} : ${mins} : ${secs}`;
  };

  // 로그인 체크 래퍼 함수 (비로그인 시 로그인 유도 창 띄움)
  const requireLogin = (actionCallback) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    actionCallback();
  };

  // 이벤트 핸들러들
  const handleFavorite = () => {
    requireLogin(() => {
      // 관심 등록 API 호출 로직
      console.holog?.("관심 등록/취소 실행");
    });
  };

  const handleChat = () => {
    requireLogin(() => {
      // 채팅하기 실행 로직
      console.log("채팅방 이동");
    });
  };

  const handleBidSubmit = () => {
    requireLogin(() => {
      // 입찰하기 실행 로직
      console.log("입찰 금액:", bidAmount);
    });
  };

  if (loading) return <div>로딩 중...</div>;

  // 작성자 본인 여부 판별 (현재 로그인한 유저 idx와 경매 작성자 idx가 같은지)
  const isAuthor = currentUser && currentUser.idx === auction.sellerIdx;

  return (
    <main>
      {/* 경매 종료 팝업 모달 */}
      {showEndModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>경매 종료</h2>
            <p>{auction.endTime} 경매 종료되었습니다.</p>
            <button onClick={() => setShowEndModal(false)}>결과 확인하기</button>
          </div>
        </div>
      )}

      {/* 로그인 유도 모달 */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>알림</h2>
            <p>로그인이 필요한 서비스입니다.</p>
            <button onClick={() => setShowLoginModal(false)}>확인</button>
          </div>
        </div>
      )}

      {/* 상단 경매 정보 영역 */}
      <section className="auction-header-section">
        <div className="product-info-box">
          {/* 본인 글일 경우에만 상단에 '삭제' 또는 '수정' 버튼 노출 (image_d1065b.png 참고) */}
          {isAuthor && <button>삭제</button>}
          
          <button onClick={handleFavorite} disabled={isEnded}>
            {auction.isFavorited ? '❤️' : '🤍'} {auction.favoriteCount}
          </button>

          <h1>{auction.title}</h1>
          <p>{auction.subTitle}</p>

          <div className="price-timer-box">
            <div>
              <span>현재 입찰가</span>
              <h2>{auction.currentPrice}원</h2>
            </div>
            <div className="timer-display">
              {/* 실시간 타이머 혹은 종료 시 00:00:00 표시 */}
              <span>{isEnded ? "00 : 00 : 00" : formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* ================= 비본인 vs 본인 버튼 영역 분기 ================= */}
          {!isAuthor ? (
            /* 일반 구매자 뷰: 종료되었거나 본인이 아니면 비활성화 처리 */
            <div className="buyer-actions">
              <button onClick={handleFavorite} disabled={isEnded}>관심 등록</button>
              <button onClick={handleChat} disabled={isEnded}>채팅하기</button>
              
              <div className="bid-input-box">
                <input 
                  type="number" 
                  placeholder="입찰가 입력" 
                  value={bidAmount} 
                  onChange={(e) => setBidAmount(e.target.value)}
                  disabled={isEnded}
                />
                <button onClick={handleBidSubmit} disabled={isEnded}>전송하기</button>
              </div>
            </div>
          ) : (
            /* 본인 글 뷰: 관심/채팅/입찰 버튼 아예 없음 (image_d1065b.png 참고) */
            <div className="author-notice-box">
              <p>내가 등록한 경매 글입니다.</p>
            </div>
          )}

          {/* 입찰 현황판 (탈퇴한 유저 내역은 백엔드에서 이미 제외되어 전달됨) */}
          <div className="bid-status-table">
            <h3>입찰 현황 {bids.length}건</h3>
            <table>
              <thead>
                <tr>
                  <th>입찰자</th>
                  <th>입찰가</th>
                  <th>입찰시간</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid, index) => (
                  <tr key={index}>
                    <td>{bid.bidderNickname || '-'}</td>
                    <td>{bid.bidAmount ? `${bid.bidAmount}원` : '-'}</td>
                    <td>{bid.createdAt || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 상품 설명 영역 */}
      <section className="product-description-section">
        <h2>상품 설명</h2>
        <div dangerouslySetInnerHTML={{ __html: auction.description }} />
      </section>

      {/* 하단 버튼 */}
      <div className="footer-buttons">
        <button>목록으로</button>
        {isAuthor && <button>수정하기</button>}
      </div>
    </main>
  );
};

export default AuctionDetail;