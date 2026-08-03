import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div style={{ padding: 80, textAlign: "center" }}>
      <h1>🥔 404</h1>
      <p>존재하지 않는 페이지예요.</p>
      <Link to="/">홈으로 돌아가기</Link>
    </div>
  );
}
