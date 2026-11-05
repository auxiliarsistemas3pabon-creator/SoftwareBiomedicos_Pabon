import { createPortal } from "react-dom";
import { Toast, type ToastData } from "./Toast";

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

/**
 * Stack flotante en la esquina inferior derecha. Se monta en
 * `document.body` vía portal para evitar problemas de `overflow:hidden` de
 * contenedores intermedios (Sidebar/AdminLayout).
 */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (typeof document === "undefined") return null;
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-label="Notificaciones"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}
