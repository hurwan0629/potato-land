import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { usedApi } from "../../api/usedApi";

export default function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [] });
  const [error, setError] = useState("");

  const q = params.get("q") ?? "";
  const page = params.get("page") ?? "1";
  const sort = params.get("sort") ?? "LATEST";

  useEffect(() => {
    let cancelled = false;

    usedApi.list({ q, page, sort })
      .then((result) => {
        if (!cancelled) {
          setError("");
          setData(result.data);
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause.message);
      });

    return () => {
      cancelled = true;
    };
  }, [q, page, sort]);

  function submitSearch(event) {
    event.preventDefault();
    const keyword = event.currentTarget.elements.q.value.trim();
    setParams(keyword ? { q: keyword } : {});
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>중고거래</h2>
      <form onSubmit={submitSearch}>
        <input
          key={q}
          name="q"
          defaultValue={q}
          placeholder="상품 검색"
        />
        <button type="submit">검색</button>
      </form>

      {error && <p role="alert">{error}</p>}

      <div>
        {data.items.map((item) => (
          <button
            key={item.listingIdx}
            type="button"
            onClick={() => navigate(`/products/${item.listingIdx}`)}
            style={{
              display: "block",
              width: "100%",
              padding: 16,
              textAlign: "left",
              marginTop: 8,
            }}
          >
            <strong>{item.title}</strong>
            {` · ${item.displayPrice.toLocaleString()}원 · 관심 ${item.favoriteCount}`}
          </button>
        ))}
      </div>
    </div>
  );
}
