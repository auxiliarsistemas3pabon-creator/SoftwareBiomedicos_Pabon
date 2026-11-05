import {
  AlertTriangle,
  Building2,
  Calendar as CalendarIcon,
  Download,
  FileSpreadsheet,
  Pencil,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconHint } from "@/components/ui/IconHint";
import type { FichaHeaderProps } from "@/types/equipment/ficha";
import { downloadEquipmentInventory } from "@/utils/equipment.inventory.export";
import { STATUS_LABEL, STATUS_TONE } from "@/utils/ficha.utils";

export function FichaHeader({
  qrSrc,
  eq,
  downloadQr,
  canEdit,
  regenerateQr,
  regeneratingQr,
  canDelete,
  role,
  onEdit,
  onDelete,
  navigate,
  branchLabel,
}: FichaHeaderProps) {
  return (
    <div className="grid items-start gap-6 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl border border-app bg-white p-3">
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR del equipo ${eq.asset_tag}`}
              className="h-48 w-48 object-contain"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center text-xs text-app-muted">
              Sin QR
            </div>
          )}
        </div>
        <p className="font-mono text-xs text-app-muted">{eq.asset_tag}</p>
        <p className="max-w-48 text-center text-[11px] text-app-muted">
          Al escanearlo abre esta hoja de vida.
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:pt-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-app">{eq.name}</h3>
          <Badge tone={STATUS_TONE[eq.status]}>{STATUS_LABEL[eq.status]}</Badge>
        </div>

        <dl className="grid w-full gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Marca" compact>
              {eq.brand_name ?? "—"}
            </Field>
            <Field label="Fecha de compra" icon={<CalendarIcon size={12} />}>
              {eq.purchase_date?.trim() ? eq.purchase_date : "No aplica"}
            </Field>
            <Field label="Modelo" compact>
              {eq.equipment_model_name ?? `Modelo #${eq.equipment_model}`}
            </Field>
            <Field label="Serie">
              {eq.serial?.trim() ? eq.serial : "No aplica"}
            </Field>
            <Field className="min-w-0" compact label="Sede" icon={<Building2 size={12} />}>
              {branchLabel}
            </Field>
            <Field className="min-w-0" compact label="Ubicación">
              {eq.location}
            </Field>
            <Field label="Clase de riesgo">
              {eq.risk_class?.trim() ? eq.risk_class : "Sin clase"}
            </Field>
            <Field label="Tecnología">
              {eq.technology_type?.trim() ? eq.technology_type : "No aplica"}
            </Field>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-2">
              {canEdit && onEdit && (
                <IconHint label="Editar">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8! w-8! px-0!"
                    aria-label="Editar"
                    onClick={() => onEdit(eq)}
                  >
                    <Pencil size={14} />
                  </Button>
                </IconHint>
              )}
              {canDelete && onDelete && (
                <IconHint label="Eliminar">
                  <Button
                    size="sm"
                    variant="danger"
                    className="h-8! w-8! px-0!"
                    aria-label="Eliminar"
                    onClick={() => onDelete(eq)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </IconHint>
              )}
              <IconHint label="Registrar mantenimiento">
                <Button
                  size="sm"
                  className="h-8! w-8! px-0!"
                  aria-label="Registrar mantenimiento"
                  onClick={() => navigate("/admin/mantenimientos")}
                >
                  <Wrench size={14} />
                </Button>
              </IconHint>
            <span className="mx-1 h-6 w-px bg-(--border)" aria-hidden />
              <IconHint label="Descargar">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8! w-8! px-0!"
                  aria-label="Descargar"
                  disabled={!qrSrc}
                  onClick={() => void downloadQr()}
                >
                  <Download size={14} />
                </Button>
              </IconHint>
              <IconHint label="Inventario">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8! w-8! px-0!"
                  aria-label="Inventario"
                  onClick={() => downloadEquipmentInventory([eq])}
                >
                  <FileSpreadsheet size={14} />
                </Button>
              </IconHint>
              {canEdit && (
                <IconHint label="Regenerar">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8! w-8! px-0!"
                    aria-label="Regenerar"
                    loading={regeneratingQr}
                    onClick={() => void regenerateQr()}
                  >
                    <RefreshCw size={14} />
                  </Button>
                </IconHint>
              )}
              {role === "tecnico" && (
                <Button
                  size="sm"
                  leftIcon={<AlertTriangle size={14} />}
                  onClick={() => navigate("/admin/fallas")}
                >
                  Reportar falla
                </Button>
              )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
  className,
  compact = false,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-app-muted">
        {icon}
        {label}
      </dt>
      <dd className={compact ? "mt-0.5 wrap-break-word text-xs leading-snug text-app" : "mt-0.5 wrap-break-word text-app"}>
        {children}
      </dd>
    </div>
  );
}
