import type { AssignedUser } from "@/types/authentication/auth";
import type { ScheduledMaintenance } from "@/types/scheduling/scheduling";

export type MaintenanceKind =
  | "PREVENTIVE"
  | "CORRECTIVE"
  | "REPAIR"
  | "CALIBRATION"
  | "INSPECTION";

export interface MaintenanceRecord {
  id: number;
  equipment: number;
  equipment_asset_tag?: string;
  equipment_name?: string;
  kind: MaintenanceKind;
  date: string;
  description: string;
  /** Comentario libre de quien ejecutó el mantenimiento (hallazgos, trabajo realizado). */
  observations?: string;
  /** Campo legacy de texto libre del backend (nombre escrito a mano). */
  technician?: string;
  assigned_engineer?: number | null;
  assigned_engineer_detail?: AssignedUser | null;
  assigned_technician?: number | null;
  assigned_technician_detail?: AssignedUser | null;
  cost?: string | null;
  pdf_file_url?: string | null;
  scheduled_maintenance?: number | null;
  scheduled_maintenance_detail?: ScheduledMaintenance | null;
  /** Orden de trabajo creada al asignar un responsable. */
  work_order?: { id: number; number: string; status: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceInput {
  equipment: number;
  kind: MaintenanceKind;
  date: string;
  description: string;
  observations?: string;
  assigned_technician?: number | null;
  assigned_engineer?: number | null;
  cost?: string;
  scheduled_maintenance?: number | null;
}
