import { useParams } from "react-router";

export default function Payment() {
  const { id } = useParams();
  return (
    <div style={{ padding: 40 }}>
      <h2>결제</h2>
      <p>상품 ID {id}에 대한 결제 수단 선택 및 결제 진행 페이지입니다.</p>
    </div>
  );
}
