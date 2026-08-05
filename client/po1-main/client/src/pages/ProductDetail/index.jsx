import { useParams } from "react-router";

export default function ProductDetail() {
  const { id } = useParams();
  return (
    <div style={{ padding: 40 }}>
      <h2>상품 상세</h2>
      <p>상품 ID: {id}</p>
      <p>이미지, 가격, 판매자 정보, 상품 설명이 들어갈 페이지입니다.</p>
    </div>
  );
}
