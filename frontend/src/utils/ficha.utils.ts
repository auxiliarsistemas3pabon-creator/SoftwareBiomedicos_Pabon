import type { EquipmentStatus } from "@/types/equipment/equipment";
import type { MaintenanceKind } from "@/types/maintenance/maintenance";
import type { ScheduleKind } from "@/types/scheduling/scheduling";

export const STATUS_LABEL: Record<EquipmentStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  IN_MAINTENANCE: "En mantenimiento",
  IN_REPAIR: "En reparación",
};

export const STATUS_TONE: Record<EquipmentStatus, "success" | "neutral" | "warning" | "danger"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  IN_MAINTENANCE: "warning",
  IN_REPAIR: "danger",
};

export const KIND_LABEL: Record<MaintenanceKind, string> = {
  PREVENTIVE: "Preventivo",
  CORRECTIVE: "Correctivo",
  REPAIR: "Reparación",
  CALIBRATION: "Calibración",
  INSPECTION: "Inspección",
};

export const KIND_TONE: Record<
  MaintenanceKind,
  "info" | "warning" | "danger" | "primary" | "neutral"
> = {
  PREVENTIVE: "info",
  CORRECTIVE: "warning",
  REPAIR: "danger",
  CALIBRATION: "primary",
  INSPECTION: "neutral",
};

// Formatea horas decimales en una unidad legible. El backend manda string|null
// (DecimalField), así que aceptamos ambos extremos.
export function formatHours(value: string | null | undefined): string {
  if (value == null || value === "") return "Sin datos";
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) return "Sin datos";
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)} h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours - days * 24);
  return remainingHours > 0 ? `${days} d ${remainingHours} h` : `${days} d`;
}

export function kindLabelScheduled(k: ScheduleKind): string {
  return k === "PREVENTIVE" ? "Preventivo" : "Reparación";
}

export function kindToneScheduled(k: ScheduleKind): "info" | "danger" {
  return k === "PREVENTIVE" ? "info" : "danger";
}
