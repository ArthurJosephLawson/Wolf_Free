import { useEffect, useRef, useState } from "react";
import { useUiStore, type Toast } from "./uiStore";

const LIFETIME = 4_000;
const LIFETIME_ERROR = 8_000;

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div className="toasts" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const lifetime =
    toast.tone === "error" ? LIFETIME_ERROR : LIFETIME;
  const [paused, setPaused] = useState(false);
  const deadline = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    if (deadline.current === null) {
      deadline.current = Date.now() + lifetime;
    }
    const id = window.setTimeout(
      () => onDismiss(toast.id),
      Math.max(deadline.current - Date.now(), 0),
    );
    return () => window.clearTimeout(id);
  }, [paused, toast.id, onDismiss, lifetime]);

  const pause = () => {
    if (paused) return;
    if (deadline.current === null) {
      deadline.current = Date.now() + lifetime;
    }
    deadline.current = Math.max(deadline.current - Date.now(), 0);
    setPaused(true);
  };

  const resume = () => {
    if (!paused) return;
    deadline.current = Date.now() + Math.max(deadline.current ?? 0, 0);
    setPaused(false);
  };

  return (
    <div
      className="toast anim-slide-in"
      data-tone={toast.tone}
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      onPointerEnter={pause}
      onPointerLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
    >
      <span className="toast__bar" aria-hidden="true" />
      <div>
        <strong style={{ display: "block" }}>{toast.title}</strong>
        {toast.body ? <span className="faint">{toast.body}</span> : null}
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
