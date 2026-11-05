// Para escanear con un celular, fija en el .env
// VITE_PUBLIC_BASE_URL=http://<IP-de-tu-PC>:5173 ; si no, usa el origen actual.

import { useRef } from "react";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Branch } from "@/types/equipment/branch";

const BASE_URL = (
  (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ||
  window.location.origin
).replace(/\/$/, "");

/** Enlace que codifica el QR de una sede: lista de equipos filtrada por esa sede. */
function branchQrUrl(branchId: number): string {
  return `${BASE_URL}/admin/equipos?branch=${branchId}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

interface SedeQrModalProps {
  branch: Branch | null;
  onClose: () => void;
}

export function SedeQrModal({ branch, onClose }: SedeQrModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const url = branch ? branchQrUrl(branch.id) : "";

  const print = () => {
    if (!branch || !qrRef.current) return;
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    win.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>QR ${escapeHtml(branch.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
  svg { width: 260px; height: 260px; }
  h1 { font-size: 20px; margin: 16px 0 4px; }
  p { margin: 2px 0; color: #444; font-size: 13px; }
</style>
</head>
<body>
  ${qrRef.current.innerHTML}
  <h1>${escapeHtml(branch.name)}</h1>
  <p>${escapeHtml(branch.city)}</p>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 300);
    });
  </script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <Modal open={!!branch} onClose={onClose} title="QR de la sede" size="sm">
      {branch && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div ref={qrRef} className="rounded-lg bg-white p-3">
            <QRCodeSVG value={url} size={220} level="M" marginSize={2} />
          </div>
          <div>
            <p className="font-medium text-app">{branch.name}</p>
            <p className="text-xs text-app-muted">{branch.city}</p>
          </div>
          <p className="break-all text-xs text-app-muted">{url}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button leftIcon={<Printer size={16} />} onClick={print}>
              Imprimir
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
