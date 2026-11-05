/**
 * Cliente WebSocket singleton para `/ws/notifications/`.
 *
 * Decisiones:
 * - Una única conexión por sesión: cada componente que quiera escuchar se
 *   suscribe con `on(handler)` y recibe el mismo stream.
 * - La autenticación viaja por la cookie httpOnly de sesión, NO por query
 *   string: el navegador la adjunta solo en el handshake porque el backend
 *   corre en el mismo sitio (same-site). Antes se mandaba el JWT como
 *   `?token=...`, lo que lo exponía en logs de servidor/proxy e historial
 *   del navegador — se quitó al migrar la auth a cookies httpOnly.
 * - Reconexión exponencial con jitter, topada a 30 s. No usa librería: el
 *   nativo basta y el bundle queda más liviano.
 * - Si el server cierra con código 4401 (sesión inválida/expirada), no se
 *   reintenta: el usuario tendrá que loguearse de nuevo. Para cualquier
 *   otro cierre sí se reintenta.
 */
import type { NotificationEvent } from "@/types/notify/notifications";

type Handler = (event: NotificationEvent) => void;

/** Siempre el origen de la pestaña (Vite :5173 / nginx). Nunca :8000. */
function getWsBaseUrl(): string {
  const explicit = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (explicit && !explicit.includes(":8000")) {
    return explicit.replace(/\/$/, "");
  }
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.host}`;
}

const AUTH_CLOSE_CODE = 4401;
const MAX_BACKOFF_MS = 30_000;

class NotificationSocket {
  private socket: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private connected = false;
  private retryAttempt = 0;
  private reconnectTimer: number | null = null;
  private intentionallyClosed = false;

  connect(): void {
    // Si ya hay conexión viva, no abrimos otra.
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.disconnect();
    this.connected = true;
    this.intentionallyClosed = false;
    this.open();
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      // Cerrar solo si ya está abierto: close() en CONNECTING dispara
      // "WebSocket is closed before the connection is established".
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "client_disconnect");
      }
    }
    this.connected = false;
    this.retryAttempt = 0;
  }

  on(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private open(): void {
    if (!this.connected) return;
    const url = `${getWsBaseUrl()}/ws/notifications/`;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.intentionallyClosed || this.socket !== socket) {
        socket.close(1000, "stale");
        return;
      }
      this.retryAttempt = 0;
    };

    socket.onmessage = (ev) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (!parsed || typeof parsed !== "object") return;
      const event = parsed as NotificationEvent;
      this.handlers.forEach((h) => {
        try {
          h(event);
        } catch (err) {
          console.error("[ws] handler threw", err);
        }
      });
    };

    socket.onclose = (ev) => {
      this.socket = null;
      if (this.intentionallyClosed) return;
      // Token inválido/expirado: dejar de intentar para no spamear.
      if (ev.code === AUTH_CLOSE_CODE) return;
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // El close handler dispara la reconexión; acá solo dejamos rastro.
      console.warn("[ws] socket error");
    };
  }

  private scheduleReconnect(): void {
    if (!this.connected) return;
    const baseDelay = Math.min(
      1000 * 2 ** this.retryAttempt,
      MAX_BACKOFF_MS,
    );
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;
    this.retryAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }
}

export const notificationsSocket = new NotificationSocket();
