import type { FailureInput, FailureSeverity } from "@/types/failure/failure";

export const SEV_LABEL: Record<FailureSeverity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

// Un solo color (rojo) para toda severidad: una falla es una falla, sin
// matices de color por tipo. El estado (abierta/resuelta) es el que
// diferencia con color — ver FailureRow.
export const SEV_TONE: Record<FailureSeverity, "info" | "warning" | "danger" | "neutral"> = {
  LOW: "danger",
  MEDIUM: "danger",
  HIGH: "danger",
  CRITICAL: "danger",
};

export const PAGE_SIZE = 6;

export const empty: FailureInput = {
  equipment: 0,
  description: "",
  severity: "MEDIUM",
};
