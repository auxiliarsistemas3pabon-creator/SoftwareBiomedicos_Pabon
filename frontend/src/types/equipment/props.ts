import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import type { Rol } from "@/types/authentication/auth";
import type { Brand, EquipmentModel } from "@/types/equipment/brand";
import type { Equipment, EquipmentStatus } from "@/types/equipment/equipment";
import type { FormState } from "@/types/equipment/form";

type SelectOption = { value: string; label: string };

// Equipment Header
export interface EquipmentHeaderProps {
  role: Rol | undefined;
  area?: string | null;
}

// Equipment Filters
export interface EquipmentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  brandFilter: string;
  onBrandFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  riskFilter: string;
  onRiskFilterChange: (value: string) => void;
  branchOptions: SelectOption[];
  brands: Brand[];
  searchOptions: { value: string; label: string; hint?: string }[];
}

// Status Select
export interface StatusSelectProps {
  value: EquipmentStatus;
  disabled?: boolean;
  onChange: (s: EquipmentStatus) => void;
}

// Equipment Row
export interface EquipmentRowProps {
  eq: Equipment;
  brands: Brand[];
  models: EquipmentModel[];
  branchName: (id: number) => string;
  canEdit: boolean;
  canCreate: boolean;
  onCreate: () => void;
  canCreateMaintenance: boolean;
  statusUpdatingId: number | null;
  onSelect: (eq: Equipment) => void;
  onChangeStatus: (eq: Equipment, status: EquipmentStatus) => void;
  onNewMaintenance: (eq: Equipment) => void;
}

// Equipment Table
export interface EquipmentTableProps extends Omit<EquipmentRowProps, "eq"> {
  items: Equipment[];
  loading: boolean;
}

// Equipment Pagination
export interface EquipmentPaginationProps {
  count: number;
  start: number;
  end: number;
  page: number;
  totalPages: number;
  loading: boolean;
  setPage: Dispatch<SetStateAction<number>>;
}

// Secciones del formulario (solo leen/escriben el form)
export interface EquipmentSectionProps {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
}

// Equipment Classification Section
export interface EquipmentClassificationSectionProps
  extends EquipmentSectionProps {
  branchOptions: SelectOption[];
  brands: Brand[];
  brandOptions: SelectOption[];
  models: EquipmentModel[];
  modelsForForm: EquipmentModel[];
  modelOptionsForm: SelectOption[];
  openCatalogForm: (kind: "brand" | "model", brandId?: number) => void;
}

// Equipment Form Modal
export interface EquipmentFormModalProps
  extends EquipmentClassificationSectionProps {
  open: boolean;
  onClose: () => void;
  editing: Equipment | null;
  formError: string | null;
  formErrorRef: RefObject<HTMLDivElement | null>;
  onSubmit: (ev: FormEvent) => void;
  saving: boolean;
  onBack?: () => void;
}
