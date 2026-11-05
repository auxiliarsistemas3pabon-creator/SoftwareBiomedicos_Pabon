export type FailureSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface FailureReport {
  id: number;
  equipment: number;
  equipment_asset_tag?: string;
  branch_name?: string;
  equipment_area?: string | null;
  description: string;
  severity: FailureSeverity;
  reported_at: string;
  reported_by?: number | null;
  resolved: boolean;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FailureInput {
  equipment: number;
  description: string;
  severity: FailureSeverity;
  reported_at?: string;
}
