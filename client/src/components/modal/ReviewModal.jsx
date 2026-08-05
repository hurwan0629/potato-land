import { useState } from "react";
import { X, Check, Star } from "lucide-react";
import { reviewsApi } from "../../api/reviewsApi";

// docs C-04 후기 작성: UI는 0.5~5점, 제출 시 uiRating * 2를 정수 rating(1~10)으로 보낸다.
export default function ReviewModal({
  transactionIdx,
  revieweeIdx,
  revieweeNickname,
  onClose,
  onSuccess,
}) {
  const [uiRating, setUiRating] = useState(5);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      await reviewsApi.create({
        transactionIdx,
        revieweeIdx,
        rating: Math.round(uiRating * 2),
        content: content.trim() || undefined,
      });

      onSuccess?.();
    } catch (err) {
      setError(err.message ?? "후기 작성에 실패했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "420px",
          padding: "24px",
          background: "#fff",
          borderRadius: "20px",
          textAlign: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>
          {revieweeNickname ? `${revieweeNickname}님에게 후기 남기기` : "후기 작성"}
        </h3>

        <div style={{ display: "flex", justifyContent: "center", gap: "4px", margin: "20px 0 8px" }}>
          {[1, 2, 3, 4, 5].map((i) => {
            const filled = uiRating >= i;
            const halfFilled = !filled && uiRating >= i - 0.5;

            return (
              <div key={i} style={{ position: "relative", width: 28, height: 28 }}>
                <Star size={28} color="#F5B039" fill={filled ? "#F5B039" : "none"} />

                {halfFilled && (
                  <div style={{ position: "absolute", inset: 0, width: "50%", overflow: "hidden" }}>
                    <Star size={28} color="#F5B039" fill="#F5B039" />
                  </div>
                )}

                <button
                  type="button"
                  aria-label={`${i - 0.5}점`}
                  onClick={() => setUiRating(i - 0.5)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "50%",
                    opacity: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                />
                <button
                  type="button"
                  aria-label={`${i}점`}
                  onClick={() => setUiRating(i)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    left: "50%",
                    opacity: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                />
              </div>
            );
          })}
        </div>

        <p style={{ margin: 0, fontWeight: "bold" }}>{uiRating.toFixed(1)}점</p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 50))}
            placeholder="거래 후기를 남겨주세요 (최대 50자, 선택)"
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: "16px",
              padding: "12px",
              borderRadius: "12px",
              resize: "none",
              fontSize: "14px",
            }}
          />
          <p style={{ margin: "4px 0 0", textAlign: "right", fontSize: "12px", color: "#999" }}>
            {content.length}/50
          </p>

          {error && <p style={{ color: "#e05252", fontSize: "13px" }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px" }}>
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              <X size={16} />
              취소
            </button>

            <button type="submit" disabled={isSubmitting}>
              <Check size={16} />
              {isSubmitting ? "제출 중..." : "작성 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
