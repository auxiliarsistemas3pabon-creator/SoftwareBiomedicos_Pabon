export type FailureSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface FailureReport {
  id: number;
  equipment: number;
  equipment_asset_tag?: string;
  branch_name?: string;
  description: string;
  severity: FailureSeverity;
  reported_at: string;
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
