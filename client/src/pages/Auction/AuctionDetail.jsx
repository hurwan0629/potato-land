import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { auctionsApi } from "../../api/auctionsApi";
import "./Auction.css";

/** URL의 상품 번호로 경매 상세를 조회하고 판매자 작업 버튼을 제공한다. */
export default function AuctionDetail() {
  const { listingIdx } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [message, setMessage] = useState("불러오는 중입니다.");

  useEffect(() => {
    auctionsApi.detail(listingIdx).then((data) => { setAuction(data); setMessage(""); }).catch((error) => setMessage(error.message));
  }, [listingIdx]);

  /** 사용자 확인 후 서버에 소프트 삭제를 요청하고 목록으로 이동한다. */
  async function handleDelete() {
    if (!window.confirm("이 경매 상품을 삭제할까요?")) return;
    try {
      await auctionsApi.remove(listingIdx, "판매자가 직접 삭제");
      navigate("/auction");
    } catch (error) { setMessage(error.message); }
  }

  if (!auction) return <p className="auction-message">{message}</p>;
  return (
    <article className="auction-page auction-detail">
      <div className="auction-detail-images">
        {auction.images.length ? auction.images.map((image) => <img key={image.imageIdx} src={image.imageUrl} alt={auction.title} />) : <span>등록된 이미지가 없습니다.</span>}
      </div>
      <div className="auction-detail-body">
        <small>{auction.category.name} · {auction.status === "ON_GOING" ? "진행 중" : "종료"}</small>
        <h1>{auction.title}</h1><strong>{auction.currentPrice.toLocaleString()}원</strong>
        <p>다음 입찰가 {auction.minNextBid.toLocaleString()}원 · 입찰 {auction.bidCount}회</p>
        <p className="auction-description">{auction.description}</p>
        <p>판매자 {auction.seller.nickname}</p>
        {auction.viewer.canEdit && <Link className="auction-secondary" to={`/auction/${listingIdx}/edit`}>수정</Link>}
        {auction.viewer.canDelete && <button className="auction-danger" type="button" onClick={handleDelete}>삭제</button>}
        {message && <p className="auction-error">{message}</p>}
      </div>
    </article>
  );
}
