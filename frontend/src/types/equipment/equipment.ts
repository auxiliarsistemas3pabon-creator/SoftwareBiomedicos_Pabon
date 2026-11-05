
export type EquipmentStatus = "ACTIVE" | "INACTIVE" | "IN_MAINTENANCE" | "IN_REPAIR";

export type RiskClass = "I" | "IIA" | "IIB" | "III";

export type CalibrationStatus = "REQUIRED" | "VALID" | "EXPIRED" | "UNKNOWN";

export type SensorStatus = "OPERATIONAL" | "DEGRADED" | "FAILED" | "UNKNOWN";

export interface Equipment {
  // =======================================
  // IDENTIFICACIÓN EQUIPO 
  // =======================================

  id: number;
  name: string;
  asset_tag: string;

  internal_code?: string | null;
  serial?: string | null;
  software_identifier?: string | null;

  // ================================
  // CLASIFICACIÓN 
  // ================================

  equipment_model: number;
  equipment_model_name?: string;
  brand?: number;
  brand_name?: string;
  technology_type?: string | null;
  biomedical_classification?: string | null;
  risk_class: RiskClass;
  risk_class_display?: string | null;

   // ===================================
  // UBICACIÓN / INFORMACIÓN DEL EQUIPO
  // ====================================

  branch: number;
  branch_name?: string;
  branch_text?: string | null;
  department?: string | null;
  city?: string | null;
  area?: string | null;
  location: string;
  manufacturer?: string | null;
  owner?: string | null;
  client_name?:string | null;

  // ================================
  // ADQUISICIÓN
  // ================================

  purchase_date: string;
  supplier_acquisition?: string | null;
  equipment_cost?: string | number | null;
  manufacture_date?: string | null;
  start_use_date?: string | null;

  // ===============================
  // GARANTÍA
  // ===============================

  warranty_start_date?: string | null;
  warranty_end_date?: string | null;

  // ===============================
  // MANTENIMIENTO
  // ===============================

  maintenance_provider?: string | null;
  maintenance_frequency_months?: number | null;
  last_preventive?: string | null;
  next_preventive?: string | null;

  // ===============================
  // CALIBRACIÓN
  // ===============================

  calibration_date?: string | null;
  calibration_frequency_months?: number | null;
  last_calibration?: string | null;
  next_calibration?: string | null;

  // ===============================
  // SEGURIDAD ELÉCTRICA
  // ===============================

  electrical_safety_class?: string | null;
  electrical_safety_type?: string | null;

  // ==============================
  // INFORMACIÓN REGULATORIA
  // ==============================

  invima_registration?: string | null;
  ecri?: string | null;

  // ================================
  // VIDA ÚTIL
  // ================================

  life_use_years?: number | null;

  // ===============================
  // ===============================
  // ESTADO
  // ==============================

  status: EquipmentStatus;
  status_display?: string | null;

  // ==============================
  // OBSERVACIONES 
  // ==============================

  observations?: string | null;

  // ==============================
  // ARCHIVOS
  // ==============================

  /** URL de la fotografía del equipo (`ImageField`). */
  equipment_image?: string | null;
  life_sheet_pdf?: string | null;

  // ==============================
  // QR
  // ============================== 
  
  qr_code?: string | null;
  qr_code_url?: string | null;

  // ==============================
  // CONFIABILIDAD
  // ==============================

  /** MTBF en horas (Decimal serializado como string). Read-only, calculado por el backend. */
  mtbf_hours?: string | null;
  /** MTTR en horas (Decimal serializado como string). Read-only, calculado por el backend. */
  mttr_hours?: string | null;
  corrective_count?: number;

  // ==============================
  // AUDITORÍA
  // ==============================

  created_at?: string;
  updated_at?: string;
}

export interface EquipmentInput {
  name: string;
  asset_tag: string;
  internal_code?: string;
  serial?: string;
  software_identifier?:string;

  equipment_model: number;

  branch: number;
  branch_text?:string;
  department?:string;
  city?: string;
  area?:string;
  location: string;

  technology_type?: string;
  biomedical_classification?:string;
  risk_class: RiskClass;

  manufacturer?: string;
  owner?: string;
  client_name?: string;


  purchase_date: string;
  supplier_acquisition?: string;
  equipment_cost?: string;
  manufacture_date?: string;
  start_use_date?: string;

  warranty_start_date?: string;
  warranty_end_date?: string;

  maintenance_provider?: string;
  maintenance_frequency_months?: number;
  last_preventive?: string;
  next_preventive?: string;

  calibration_date?: string;
  calibration_frequency_months?: number;
  last_calibration?: string;
  next_calibration?: string;

  electrical_safety_class?: string;
  electrical_safety_type?:string;

  invima_registration?: string;
  ecri?: string;

  life_use_years?:number;

  status: EquipmentStatus;

  observations?:string;
}
