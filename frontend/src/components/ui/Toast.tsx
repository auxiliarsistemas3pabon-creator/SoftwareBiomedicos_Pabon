import { BellRing, X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";

export interface ToastData {
  id: string;
  title: string;
  body?: string;
  meta?: string;
  /** Auto-dismiss en ms. Por defecto 6 000. */
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const duration = toast.duration ?? 6000;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto w-80 rounded-xl border border-app bg-surface text-app shadow-lg",
        "toast-enter",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BellRing size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{toast.title}</p>
          {toast.body ? (
            <p className="mt-0.5 text-sm text-app-muted">{toast.body}</p>
          ) : null}
          {toast.meta ? (
            <p className="mt-1 text-xs text-app-muted">{toast.meta}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Cerrar notificación"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-app-muted hover:bg-app-muted hover:text-app"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
