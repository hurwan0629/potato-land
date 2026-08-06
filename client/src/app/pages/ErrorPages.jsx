import { AlertTriangle, ArrowLeft, Home, RotateCcw } from "lucide-react";
import { Link, useNavigate, useRouteError } from "react-router";

export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = error?.status === 404
    ? "요청한 페이지를 찾을 수 없습니다."
    : error?.message ?? "페이지를 표시하는 중 문제가 발생했습니다.";

  return (
    <main className="full-error-page">
      <span className="full-error-page__mascot" aria-hidden="true">🥔</span>
      <p className="eyebrow">잠깐만요</p>
      <h1>{message}</h1>
      <p>주소를 다시 확인하거나 잠시 후 다시 시도해주세요.</p>
      <div>
        <button type="button" className="button button--secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          이전 페이지
        </button>
        <button type="button" className="button" onClick={() => globalThis.location.reload()}>
          <RotateCcw size={18} />
          새로고침
        </button>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <div className="page-container full-error-page full-error-page--inside">
      <AlertTriangle size={38} />
      <p className="eyebrow">404 Not Found</p>
      <h1>길을 잃은 감자예요</h1>
      <p>요청하신 페이지가 없거나 이동되었습니다.</p>
      <Link to="/" className="button"><Home size={18} />처음으로 돌아가기</Link>
    </div>
  );
}
