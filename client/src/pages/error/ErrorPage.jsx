import { useRouteError, Link } from "react-router";

export default function ErrorPage() {
  const error = useRouteError();

  return (
    <div style={{ padding: 80, textAlign: "center" }}>
      <h1>🥔 문제가 발생했어요</h1>
      <p>{error?.statusText || error?.message || "알 수 없는 오류입니다."}</p>
      <Link to="/">처음으로 돌아가기</Link>
    </div>
  );
}
