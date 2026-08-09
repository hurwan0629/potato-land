import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { auctionsApi } from "../../api/auctionsApi";
import "./Auction.css";

const categories = ["의류", "전자기기", "뷰티", "반려동물 용품", "도서", "액세서리", "신발", "기타"];
const initialForm = { title: "", description: "", categoryIdx: "1", productStatus: "USED", startPrice: "", preferredTradeLocation: "" };

/** 등록과 수정에서 공통으로 사용하는 경매 상품 입력 화면이다. */
export default function AuctionForm() {
  const { listingIdx } = useParams();
  const isEdit = Boolean(listingIdx);
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    auctionsApi.detail(listingIdx).then((data) => setForm({ title: data.title, description: data.description, categoryIdx: String(data.category.categoryIdx), productStatus: data.productStatus, startPrice: String(data.startPrice), preferredTradeLocation: data.preferredTradeLocation ?? "" })).catch((error) => setMessage(error.message));
  }, [isEdit, listingIdx]);

  /** 변경된 입력 필드 하나를 현재 폼 상태에 반영한다. */
  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  /** 입력 내용을 multipart/form-data로 만들어 등록 또는 수정 API를 호출한다. */
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (!(isEdit && key === "startPrice")) payload.append(key, value);
    });
    images.forEach((image) => payload.append("images", image));
    try {
      const data = isEdit ? await auctionsApi.update(listingIdx, payload) : await auctionsApi.create(payload);
      navigate(`/auction/${data.listingIdx}`);
    } catch (error) { setMessage(error.message); }
  }

  return (
    <section className="auction-page"><h1>{isEdit ? "경매 수정" : "경매 등록"}</h1>
      <form className="auction-form" onSubmit={handleSubmit}>
        <label>상품명<input name="title" value={form.title} onChange={handleChange} maxLength="200" required /></label>
        <label>카테고리<select name="categoryIdx" value={form.categoryIdx} onChange={handleChange}>{categories.map((name, index) => <option value={index + 1} key={name}>{name}</option>)}</select></label>
        <label>상품 상태<select name="productStatus" value={form.productStatus} onChange={handleChange}><option value="NEW">새 상품</option><option value="LIKE_NEW">거의 새 상품</option><option value="USED">사용감 있음</option><option value="DAMAGED">하자 있음</option></select></label>
        {!isEdit && <label>시작 가격<input type="number" min="0" name="startPrice" value={form.startPrice} onChange={handleChange} required /></label>}
        <label>거래 희망 지역<input name="preferredTradeLocation" value={form.preferredTradeLocation} onChange={handleChange} /></label>
        <label>상세 설명<textarea name="description" value={form.description} onChange={handleChange} rows="8" required /></label>
        <label>상품 이미지(최대 4장)<input type="file" accept="image/*" multiple onChange={(event) => setImages(Array.from(event.target.files).slice(0, 4))} /></label>
        {message && <p className="auction-error">{message}</p>}
        <button className="auction-primary" type="submit">{isEdit ? "수정 완료" : "등록하기"}</button>
      </form>
    </section>
  );
}
