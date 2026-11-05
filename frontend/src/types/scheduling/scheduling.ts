import type { AssignedUser } from "@/types/authentication/auth";
import type { MaintenanceRecord } from "@/types/maintenance/maintenance";

export type ScheduleKind = "PREVENTIVE" | "REPAIR";

export interface RequestedByUser {
  id: number;
  username: string;
  full_name: string;
  area?: string | null;
}

export interface ScheduledMaintenance {
  id: number;
  equipment: number;
  equipment_asset_tag?: string;
  equipment_name?: string;
  branch_name?: string;
  kind: ScheduleKind;
  /** Fecha en que se creó la solicitud (solo lectura). */
  requested_date: string;
  requested_by?: number | null;
  requested_by_detail?: RequestedByUser | null;
  /** Área del solicitante; si no tiene, la del equipo. */
  requesting_area?: string | null;
  /** Fecha de programación; null mientras la solicitud no se agenda. */
  scheduled_date: string | null;
  notes?: string;
  assigned_engineer?: number | null;
  assigned_engineer_detail?: AssignedUser | null;
  assigned_technician?: number | null;
  assigned_technician_detail?: AssignedUser | null;
  is_completed: boolean;
  notified_at?: string | null;
  maintenance_record?: number | null;
  maintenance_record_detail?: MaintenanceRecord | null;
  /** Orden de trabajo creada al asignar la solicitud. */
  work_order?: {
    id: number;
    number: string;
    status: string;
    end_date?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
}

/** Campos que envía el formulario de "Nueva solicitud". */
export interface ScheduleCreateInput {
  equipment: number;
  kind: ScheduleKind;
  requested_date?: string;
  notes?: string;
}

/** Campos editables al programar/asignar una solicitud existente. */
export interface ScheduleUpdateInput {
  equipment?: number;
  kind?: ScheduleKind;
  scheduled_date?: string | null;
  notes?: string;
  assigned_technician?: number | null;
  assigned_engineer?: number | null;
  is_completed?: boolean;
}
