import type {
  EquipmentStatus,
  RiskClass,
} from "@/types/equipment/equipment";
import type { FormState } from "@/types/equipment/form";

export const STATUS_LABEL: Record<EquipmentStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  IN_MAINTENANCE: "En mantenimiento",
  IN_REPAIR: "En reparación",
};

export const STATUS_TONE: Record<EquipmentStatus, "success" | "neutral" | "warning" | "danger"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  IN_MAINTENANCE: "warning",
  IN_REPAIR: "danger",
};

export const RISK_LABEL: Record<RiskClass, string> = {
  I: "Clase I · Riesgo bajo",
  IIA: "Clase IIA · Riesgo moderado",
  IIB: "Clase IIB · Riesgo moderado-alto",
  III: "Clase III · Riesgo alto",
};

export const RISK_TONE: Record<RiskClass, "success" | "info" | "warning" | "danger"> = {
  I: "success",
  IIA: "info",
  IIB: "warning",
  III: "danger",
};

/** Opciones del propietario: los nombres de `ProviderType` del backend (se guarda el nombre). */
export const OWNER_OPTIONS: { value: string; label: string }[] = [
  "Impormesan",
  "Invermedica",
  "SIEMENS",
  "General electric healthare",
  "Top Medical Systems",
  "Stryker",
  "Biotronitech",
  "C Medical",
  "Medicah",
  "Rx S.A.S",
  "Drager Colombia",
].map((name) => ({ value: name, label: name }));

export const PAGE_SIZE = 10;
export const NEW_BRAND_VALUE = "__new_brand__";
export const NEW_MODEL_VALUE = "__new_model__";

export const empty: FormState = {
  name: "",
  asset_tag: "",
  internal_code: "",
  serial: "",
  software_identifier:"",

  brand: 0,
  equipment_model: 0,

  branch: 0,
  branch_text:"",
  department:"",
  city:"",
  area:"",
  location: "",

  technology_type:"",
  biomedical_classification:"",
  risk_class:"I",

  manufacturer:"",
  owner:"",
  client_name:"",

  purchase_date: "",
  manufacture_date:"",
  supplier_acquisition:"",
  start_use_date:"",
  equipment_cost:"",

  warranty_start_date:"",
  warranty_end_date:"",

  maintenance_provider:"",
  maintenance_frequency_months:"",
  last_preventive:"",
  next_preventive:"",

  calibration_date:"",
  calibration_frequency_months:"",
  last_calibration:"",
  next_calibration:"",

  electrical_safety_class:"",
  electrical_safety_type:"",

  invima_registration:"",
  ecri:"",

  life_use_years:"",

  status: "ACTIVE",

  observations:"",
};

export const STATUS_BADGE_CLASS: Record<EquipmentStatus, string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40",
  INACTIVE:
    "border-app bg-app-muted text-app-muted hover:bg-app-muted/70 dark:hover:bg-white/10 dark:hover:text-app",
  IN_MAINTENANCE:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/40",
  IN_REPAIR:
    "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/40",
};
