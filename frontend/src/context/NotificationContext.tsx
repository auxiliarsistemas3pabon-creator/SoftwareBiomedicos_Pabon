/**
 * Provider que mantiene viva la conexión WS y publica cada evento como toast.
 *
 * Se monta entre `AuthProvider` y el router para que pueda leer el usuario
 * actual (vía `useAuth()`) y abrir/cerrar el socket con el ciclo de vida de
 * la sesión.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ToastContainer } from "@/components/ui/ToastContainer";
import type { ToastData } from "@/components/ui/Toast";
import { notificationsSocket } from "@/lib/websocket";
import type { NotificationEvent } from "@/types/notify/notifications";
import { useAuth } from "./AuthContext";

interface NotificationContextValue {
  /** Inserta un toast manualmente (UI-only, no viaja por el socket). */
  notify: (toast: Omit<ToastData, "id">) => void;
  /** Cierra un toast por id. */
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const MAX_TOASTS = 5;

function toastFromEvent(event: NotificationEvent): Omit<ToastData, "id"> {
  switch (event.type) {
    case "schedule_email_sent": {
      const sentAtLocal = formatLocalTime(event.sent_at);
      const fecha = event.scheduled_date || "sin programar";
      return {
        title: "Correo de solicitud enviado",
        body: `${event.equipment_asset_tag} · ${fecha}`,
        meta: `${event.branch_name} · ${sentAtLocal}`,
      };
    }
    case "overdue_maintenance": {
      const delay =
        event.days_overdue === 0
          ? "Vence hoy"
          : `${event.days_overdue} día${event.days_overdue === 1 ? "" : "s"} de retraso`;
      return {
        title: "Mantenimiento vencido",
        body: `${event.equipment_asset_tag} · fecha de fin ${event.scheduled_date}`,
        meta: delay,
      };
    }
    default:
      return { title: "Notificación", body: JSON.stringify(event) };
  }
}

function formatLocalTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function genId(): string {
  // crypto.randomUUID está disponible en todos los browsers que soporta Vite 7.
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { usuario, loading } = useAuth();
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((toast: Omit<ToastData, "id">) => {
    setToasts((prev) => {
      const next = [...prev, { ...toast, id: genId() }];
      // Mantener una cola manejable: si llegan ráfagas, descartamos los más viejos.
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  // Ciclo de vida del socket atado a una sesión ya hidratada. No abrir
  // durante `loading`: el perfil en localStorage no implica cookie JWT.
  useEffect(() => {
    if (loading || !usuario) {
      notificationsSocket.disconnect();
      return;
    }
    notificationsSocket.connect();
    const unsubscribe = notificationsSocket.on((event) => {
      notify(toastFromEvent(event));
    });
    return () => {
      unsubscribe();
    };
  }, [usuario, loading, notify]);

  // Al desmontar el provider (logout, navegación a /), cerramos el canal.
  useEffect(() => {
    return () => notificationsSocket.disconnect();
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications debe usarse dentro de NotificationProvider");
  }
  return ctx;
}
