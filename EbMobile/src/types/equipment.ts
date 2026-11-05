export type EquipmentStatus = "ACTIVE" | "INACTIVE" | "IN_MAINTENANCE" | "IN_REPAIR";

export type RiskClass = "I" | "IIA" | "IIB" | "III";

export interface Equipment {
  id: number;
  name: string;
  asset_tag: string;
  equipment_model: number;
  equipment_model_name?: string;
  brand?: number;
  brand_name?: string;
  branch: number;
  branch_name?: string;
  location: string;
  purchase_date: string;
  status: EquipmentStatus;
  risk_class: RiskClass;
  qr_code_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EquipmentInput {
  name: string;
  asset_tag: string;
  equipment_model: number;
  branch: number;
  location: string;
  purchase_date: string;
  status: EquipmentStatus;
  risk_class: RiskClass;
}
