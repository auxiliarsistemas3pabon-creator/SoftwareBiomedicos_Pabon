export type WorkOrderServiceType =
  | "PREVENTIVE"
  | "CORRECTIVE"
  | "CALIBRATION"
  | "INSTALLATION"
  | "INSPECTION";

export type WorkOrderStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "FINISHED"
  | "CANCELLED";

export interface WorkOrder {
  id: number;
  equipment: number;
  equipment_asset_tag?: string;
  equipment_name?: string;
  number: string;
  service_type: WorkOrderServiceType;
  service_type_display?: string;
  start_date: string;
  end_date?: string | null;
  description: string;
  technician?: number | null;
  technician_name?: string | null;
  status: WorkOrderStatus;
  status_display?: string;
  created_at?: string;
}

export interface WorkOrderSparePart {
  id: number;
  name: string;
  reference: string;
  quantity: number;
  unit_cost: string;
  total_cost: string;
}

export interface WorkOrderMeasurement {
  id: number;
  parameter: string;
  expected_value: string;
  measured_value: string;
  unit: string;
  passed: boolean;
}

export interface WorkOrderSignature {
  id: number;
  role: "TECHNICIAN" | "ENGINEER" | "CLIENT";
  signed_by: string;
  signed_at?: string;
}

export interface WorkOrderCost {
  id: number;
  labor_cost: string;
  spare_parts_cost: string;
  transport_cost: string;
  other_cost: string;
  total?: string;
}

export interface WorkOrderDetail extends WorkOrder {
  spare_parts: WorkOrderSparePart[];
  measurements: WorkOrderMeasurement[];
  evidences: { id: number; evidence_type: string; description: string }[];
  signatures: WorkOrderSignature[];
  cost: WorkOrderCost | null;
}

export interface WorkOrderInput {
  equipment: number;
  number: string;
  service_type: WorkOrderServiceType;
  start_date: string;
  description: string;
  status: WorkOrderStatus;
  technician?: number | null;
}
