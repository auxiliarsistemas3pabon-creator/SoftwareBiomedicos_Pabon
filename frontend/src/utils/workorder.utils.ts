import type { FailureSeverity } from "@/types/failure/failure";
import type { WorkOrderInput, WorkOrderServiceType, WorkOrderStatus } from "@/types/equipment/workorder";

export const TYPE_LABEL: Record<WorkOrderServiceType, string> = {
  PREVENTIVE: "Preventivo",
  CORRECTIVE: "Correctivo",
  CALIBRATION: "Calibración",
  INSTALLATION: "Instalación",
  INSPECTION: "Inspección",
};

export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  FINISHED: "Terminada",
  CANCELLED: "Cancelada",
};

export const STATUS_TONE: Record<
  WorkOrderStatus,
  "neutral" | "info" | "success" | "danger"
> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  FINISHED: "success",
  CANCELLED: "danger",
};

export const FAIL_SEV_LABEL: Record<FailureSeverity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export const EVIDENCE_LABEL = {
  PHOTO: "Fotografía",
  VIDEO: "Video",
  DOCUMENT: "Documento",
  AUDIO: "Audio",
} as const;

export const SIGNATURE_LABEL = {
  TECHNICIAN: "Técnico",
  ENGINEER: "Ingeniero",
  CLIENT: "Cliente",
} as const;

export const today = () => new Date().toISOString().slice(0, 16);
export const PAGE_SIZE = 6;

export const emptyForm: WorkOrderInput = {
  equipment: 0,
  number: "",
  service_type: "PREVENTIVE",
  start_date: today(),
  end_date: "",
  description: "",
  technician: null,
  status: "PENDING",
};
