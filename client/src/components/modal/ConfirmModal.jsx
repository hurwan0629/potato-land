import { X } from "lucide-react";
import Button from "../button/Button";
import "./ConfirmModal.css";

export default function ConfirmModal({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = "확인",
  cancelLabel = "취소",
  showCancel = true,
}) {
  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>{title}</h3>
          <button type="button" className="confirm-modal-close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {children && <div className="confirm-modal-body">{children}</div>}

        <div className="confirm-modal-footer">
          {showCancel && (
            <Button variant="text" onClick={onClose}>
              {cancelLabel}
            </Button>
          )}
          <Button variant="review" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
