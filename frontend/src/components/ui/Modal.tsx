import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Encima de otro modal (p. ej. Nueva marca sobre Nuevo equipo). */
  nested?: boolean;
}

const sizes: Record<NonNullable<ModalProps["size"]>, string> = {
  xs: "w-max max-w-60",
  sm: "w-full max-w-md",
  md: "w-full max-w-lg",
  lg: "w-full max-w-2xl",
  xl: "w-full max-w-4xl",
};

const closeStack: Array<() => void> = [];

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  nested = false,
}: ModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const entry = () => onCloseRef.current();
    closeStack.push(entry);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (closeStack[closeStack.length - 1] !== entry) return;
      e.preventDefault();
      entry();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const idx = closeStack.lastIndexOf(entry);
      if (idx >= 0) closeStack.splice(idx, 1);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4",
        nested ? "z-[60]" : "z-50",
      )}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 rounded-xl border border-app bg-surface shadow-xl",
          sizes[size],
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between border-b border-app",
            size === "xs" ? "px-2.5 py-1.5" : "px-5 py-3",
          )}
        >
          <h2
            className={cn(
              "font-semibold text-app",
              size === "xs" ? "text-sm" : "text-base",
            )}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-app-muted hover:bg-app-muted hover:text-app"
          >
            <X size={16} />
          </button>
        </div>
        <div
          className={cn(
            "max-h-[75vh] overflow-y-auto",
            size === "xs" ? "p-2.5" : "p-5",
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
