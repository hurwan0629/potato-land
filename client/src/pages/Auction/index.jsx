import { useEffect, useState } from "react";
import { Link } from "react-router";

import { auctionsApi } from "../../api/auctionsApi";
import "./Auction.css";

/** 경매 목록을 검색하고 카드 형태로 표시한다. */
export default function Auction() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("LATEST");
  const [result, setResult] = useState({ items: [], totalCount: 0 });
  const [message, setMessage] = useState("불러오는 중입니다.");

  useEffect(() => {
    let active = true;
    auctionsApi.list({ q: query, sort, limit: 16 })
      .then((data) => {
        if (!active) return;
        setResult(data);
        setMessage(data.items.length ? "" : "등록된 경매 상품이 없습니다.");
      })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [query, sort]);

  return (
    <section className="auction-page">
      <div className="auction-heading">
        <div><h1>경매</h1><p>마음에 드는 상품에 참여해 보세요.</p></div>
        <Link className="auction-primary" to="/auction/new">경매 등록</Link>
      </div>
      <div className="auction-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명 검색" />
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="LATEST">최신순</option><option value="ENDING_SOON">마감 임박순</option>
          <option value="PRICE_ASC">낮은 가격순</option><option value="PRICE_DESC">높은 가격순</option>
        </select>
      </div>
      {message && <p className="auction-message">{message}</p>}
      <div className="auction-grid">
        {result.items.map((item) => (
          <Link className="auction-card" to={`/auction/${item.listingIdx}`} key={item.listingIdx}>
            <div className="auction-card-image">{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : <span>이미지 없음</span>}</div>
            <small>{item.category.name} · {item.status === "ON_GOING" ? "진행 중" : "종료"}</small>
            <h2>{item.title}</h2><strong>{item.currentPrice.toLocaleString()}원</strong>
            <p>입찰 {item.bidCount} · 관심 {item.favoriteCount}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
