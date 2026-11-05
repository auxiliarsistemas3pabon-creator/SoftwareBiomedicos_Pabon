/**
 * Convierte una URL de archivo (QR, PDF, foto) a una ruta same-origin
 * `/media/...` para que el proxy de Vite la sirva. El API a veces devuelve
 * `http://localhost:8000/media/...` o, con MEDIA_URL sin slash, una URL
 * mal juntada tipo `/api/v1/equipment/media/...`.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    const path = parsed.pathname;
    const mediaAt = path.indexOf("/media/");
    if (mediaAt >= 0) {
      return `${path.slice(mediaAt)}${parsed.search}`;
    }
    if (path.startsWith("/media") || path.startsWith("media/")) {
      const normalized = path.startsWith("/") ? path : `/${path}`;
      return `${normalized}${parsed.search}`;
    }
  } catch {
    if (url.startsWith("/media/") || url.startsWith("media/")) {
      return url.startsWith("/") ? url : `/${url}`;
    }
  }
  return url;
}
