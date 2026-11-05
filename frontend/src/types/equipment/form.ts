import type { EquipmentStatus, RiskClass } from "@/types/equipment/equipment";

export interface FormState {
  name: string;
  asset_tag: string;
  internal_code:string;
  serial:string;
  software_identifier:string;

  // brand sólo se usa en el form para filtrar los modelos disponibles. NO
  // se envía al backend (la marca es derivada del modelo).
  brand: number;
  equipment_model: number;

  branch: number;
  branch_text: string;
  department:string;
  city:string;
  area:string;
  location: string;
  
  technology_type:string;
  biomedical_classification:string;
  risk_class:RiskClass;

  manufacturer: string;
  owner:string;
  client_name:string;

  purchase_date:string;
  manufacture_date:string;
  supplier_acquisition: string;
  start_use_date:string;
  equipment_cost: string;

  warranty_start_date: string;
  warranty_end_date: string;

  maintenance_provider:string;
  maintenance_frequency_months:string;
  last_preventive: string;
  next_preventive:string;

  calibration_date: string;
  calibration_frequency_months: string;
  last_calibration: string;
  next_calibration:string;

  electrical_safety_class: string;
  electrical_safety_type:string;

  invima_registration: string;
  ecri: string;

  life_use_years: string;
  
  status: EquipmentStatus;

  observations:string;
}
