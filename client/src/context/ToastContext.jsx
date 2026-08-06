import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

const ToastContext = createContext(null);

function createToastId() {
  return globalThis.crypto?.randomUUID?.() ?? `toast-${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((toastId) => {
    const timer = timersRef.current.get(toastId);
    if (timer) {
      globalThis.clearTimeout(timer);
      timersRef.current.delete(toastId);
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const notify = useCallback((message, type = "info", duration = 3200) => {
    const id = createToastId();
    setToasts((current) => [...current, { id, message, type }].slice(-4));

    const timer = globalThis.setTimeout(() => {
      timersRef.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, duration);
    timersRef.current.set(id, timer);

    return id;
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => globalThis.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const value = useMemo(() => ({ dismiss, notify }), [dismiss, notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <article key={toast.id} className={`toast toast--${toast.type}`}>
            <span className="toast__icon" aria-hidden="true">
              {toast.type === "success" && <CheckCircle2 size={20} />}
              {toast.type === "error" && <CircleAlert size={20} />}
              {toast.type === "info" && <Info size={20} />}
            </span>
            <p>{toast.message}</p>
            <button
              type="button"
              className="icon-button icon-button--small"
              aria-label="알림 닫기"
              onClick={() => dismiss(toast.id)}
            >
              <X size={17} />
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast는 ToastProvider 내부에서 사용해야 합니다.");
  }
  return context;
}
