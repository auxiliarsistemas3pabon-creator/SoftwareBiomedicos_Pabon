import { assignedFirstName } from "@/lib/users";
import type {
  MaintenanceInput,
  MaintenanceKind,
  MaintenanceRecord,
} from "@/types/maintenance/maintenance";

export const TECHNICIAN_ROLES = ["tecnico","ingeniero"];
export const PAGE_SIZE = 20;

export const KIND_LABEL: Record<MaintenanceKind,string> = {
    PREVENTIVE:"Preventivo",
    CORRECTIVE:"Correctivo",
    REPAIR:"Reparación",
    CALIBRATION:"Calibración",
    INSPECTION:"Inspección",
}

export const KIND_TONE: Record<
    MaintenanceKind,
    "info" | "warning" | "danger" | "primary" | "neutral"
> = {
    PREVENTIVE:"info",
    CORRECTIVE:"warning",
    REPAIR:"danger",
    CALIBRATION:"primary",
    INSPECTION:"neutral",
}

export const empty: MaintenanceInput = {
  equipment: 0,
  kind: "PREVENTIVE",
  date: "",
  description: "",
  observations: "",
  assigned_technician: null,
  assigned_engineer: null,
  cost: "",
  scheduled_maintenance: null,
};

// El responsable viene en los campos anidados que devuelve el backend
// (assigned_technician_detail / assigned_engineer_detail). Como fallback,
// se usa el campo legacy de texto libre `technician` si existe.
export const labelForTechnician = (m: MaintenanceRecord) =>
  assignedFirstName(m.assigned_technician_detail) ??
  assignedFirstName(m.assigned_engineer_detail) ??
  (m.technician?.trim().split(/\s+/)[0] || "—");

