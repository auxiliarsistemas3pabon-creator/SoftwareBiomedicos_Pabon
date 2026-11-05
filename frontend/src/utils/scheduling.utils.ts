import { assignedUserName } from "@/lib/users";
import type {
  ScheduleKind,
  ScheduledMaintenance,
} from "@/types/scheduling/scheduling";
import type { FormState } from "@/types/scheduling/form";

export const TECHNICIAN_ROLES = ["tecnico", "ingeniero"];

export const KIND_LABEL: Record<ScheduleKind, string> = {
  PREVENTIVE: "Preventivo",
  REPAIR: "Reparación",
};

export function scheduleEstado(s: ScheduledMaintenance): {
  label: string;
  tone: "success" | "info" | "warning";
} {
  if (s.is_completed || s.work_order?.status === "FINISHED") {
    return { label: "Cumplida", tone: "success" };
  }
  if (s.work_order?.status === "IN_PROGRESS") {
    return { label: "En proceso", tone: "info" };
  }
  return { label: "Pendiente", tone: "warning" };
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export const today = () => new Date().toISOString().slice(0, 10);
export const PAGE_SIZE = 6;

export const empty: FormState = {
  equipment: 0,
  kind: "PREVENTIVE",
  requested_date: today(),
  scheduled_date: "",
  notes: "",
  assigned_technician: null,
  assigned_engineer: null,
};

// El backend devuelve el responsable en dos campos anidados según el rol:
// assigned_technician_detail (técnico) o assigned_engineer_detail (ingeniero).
export const labelForScheduleTechnician = (s: ScheduledMaintenance) =>
  assignedUserName(s.assigned_technician_detail) ??
  assignedUserName(s.assigned_engineer_detail);

export const labelForRequester = (s: ScheduledMaintenance) =>
  s.requested_by_detail?.full_name || s.requested_by_detail?.username || null;
