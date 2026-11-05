import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function IconHint({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function show() {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.top - 4, left: r.left + r.width / 2 });
  }

  return (
    <span
      ref={ref}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onFocus={show}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos &&
        createPortal(
          <span
            style={{ top: pos.top, left: pos.left }}
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border border-app bg-surface px-1.5 py-0.5 text-[11px] leading-none text-app"
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
