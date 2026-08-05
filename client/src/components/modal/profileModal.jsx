import { useState } from "react";
import { X, Check } from "lucide-react";

export default function EditProfileModal({
  user,
  onClose,
  onSave,
}) {
  const [introduction, setIntroduction] = useState(
    user?.introduction ?? ""
  );

  const handleSubmit = (e) => {
    e.preventDefault()

    onSave({
      introduction,
    })
  }

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
          width: "500px",
          padding: "24px",
          background: "#fff",
          borderRadius: "20px",
          textAlign: "center",
        }}
      >
        {/* 프로필 사진 */}
        <img
          src={user?.profileImage ?? "/profile.png"}
          alt="프로필"
          style={{
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        {/* 사진 수정 */}
        <div>
          <button
            type="button"
            onClick={() => {
              console.log("사진 수정");
            }}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "20px",
              marginTop: "10px",
            }}
          >
            사진 수정
          </button>
        </div>

        {/* 소개글 */}
        <form onSubmit={handleSubmit}>
          <textarea
            value={introduction}
            onChange={(e) =>
              setIntroduction(e.target.value)
            }
            placeholder="소개글을 입력해주세요"
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: "20px",
              padding: "16px",
              resize: "none",
              borderRadius: "15px",
              fontSize: "18px",
            }}
          />

          {/* 버튼 */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
            >
              <X size={18} />
              취소
            </button>

            <button type="submit">
              <Check size={18} />
              완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}      