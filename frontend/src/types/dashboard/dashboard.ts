import type { EquipmentStatus } from "@/types/equipment/equipment";
import type { MaintenanceKind } from "@/types/maintenance/maintenance";
import type { ScheduleKind } from "@/types/scheduling/scheduling";

export type FailureSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface DashboardKpis {
  equipment: {
    active: number;
    in_maintenance: number;
    in_repair: number;
    inactive: number;
    total: number;
  };
  failures: {
    critical_open: number;
    total_open: number;
  };
  scheduling: {
    next_7_days: number;
    overdue: number;
  };
  maintenance: {
    this_month_count: number;
    /** Decimal serializado como string. */
    this_month_cost: string;
  };
}

export interface EquipmentStatusBucket {
  status: EquipmentStatus;
  count: number;
}

export interface FailureSeverityBucket {
  severity: FailureSeverity;
  open: number;
  resolved: number;
}

export interface MaintenanceMonthBucket {
  /** Formato YYYY-MM. */
  month: string;
  PREVENTIVE: number;
  CORRECTIVE: number;
  REPAIR: number;
  CALIBRATION: number;
  INSPECTION: number;
  /** Decimal como string. */
  cost: string;
}

export interface OverdueSchedule {
  id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_asset_tag: string;
  scheduled_date: string;
  days_overdue: number;
  kind: ScheduleKind;
}

export interface WorstMtbfEquipment {
  id: number;
  name: string;
  asset_tag: string;
  branch_name: string;
  mtbf_hours: string;
  failures_count: number;
}

export interface MyScheduleTask {
  id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_asset_tag: string;
  scheduled_date: string;
  kind: ScheduleKind;
}

export interface MyFailureTask {
  id: number;
  equipment_id: number;
  equipment_name: string;
  severity: FailureSeverity;
  reported_at: string;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  distributions: {
    equipment_by_status: EquipmentStatusBucket[];
    failures_by_severity: FailureSeverityBucket[];
  };
  time_series: {
    maintenance_by_month: MaintenanceMonthBucket[];
    schedules?: { date: string; kind?: string; resolved: boolean }[];
    maintenance_costs?: { date: string; cost: string }[];
  };
  lists: {
    overdue_schedules: OverdueSchedule[];
    worst_mtbf: WorstMtbfEquipment[];
  };
  my_tasks: {
    schedules: MyScheduleTask[];
    failures: MyFailureTask[];
  };
  my_week?: {
    week_start: string;
    week_end: string;
    by_area: { area: string; count: number }[];
    records: {
      id: number;
      date: string;
      kind: MaintenanceKind;
      equipment_name: string;
      equipment_asset_tag: string;
      area: string;
    }[];
  } | null;
  area_ops?: {
    source?: "failures" | "schedules";
    area: string;
    kpis: {
      total: number;
      open: number;
      resolved: number;
      this_week: number;
      this_week_open?: number;
      this_week_resolved?: number;
    };
    by_status: { status: "open" | "resolved"; count: number }[];
    this_week_by_day: { date: string; count: number }[];
    /** Puntos de fecha para el dashboard de usuario (solicitudes). */
    series?: { date: string; resolved: boolean }[];
    recent: {
      id: number;
      equipment_name: string;
      equipment_asset_tag: string;
      area: string;
      severity: FailureSeverity;
      resolved: boolean;
      reported_at: string;
      resolution_notes?: string;
      opportunity_hours?: number | null;
    }[];
  } | null;
  engineer_tasks?: {
    kpis: {
      assigned: number;
      pending: number;
      in_progress: number;
      resolved: number;
    };
    series?: {
      status: string;
      start_date: string;
      end_date: string | null;
    }[];
    recent: {
      id: number;
      number: string;
      equipment_name: string;
      equipment_asset_tag: string;
      service_type: string;
      status: string;
      start_date: string;
      description: string;
    }[];
  } | null;
}

export type { MaintenanceKind };
