import type { FailureSeverity } from "@/types/failure/failure";
import type { WorkOrder, WorkOrderInput, WorkOrderStatus } from "@/types/equipment/workorder";
import type { Dispatch, SetStateAction, FormEvent } from "react";

export interface WorkOrderHeaderProps {
  isEngineer: boolean;
}

export interface WorkOrderFiltersProps {
  onSearchChange: (value: string) => void;
  orderOptions: { value: string; label: string; hint?: string }[];
  equipmentSearchOptions: { value: string; label: string; hint?: string }[];
  onEquipmentFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
}

export interface WorkOrderRowProps {
  w: WorkOrder;
  isEngineer: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onComplete: (w: WorkOrder) => void;
  onDetail: (w: WorkOrder) => void;
  onEdit: (w: WorkOrder) => void;
  onDelete: (w: WorkOrder) => void;
  canCreate: boolean;
  onCreate: () => void;
}

export interface WorkOrderTableProps extends Omit<WorkOrderRowProps, "w"> {
  items: WorkOrder[];
  loading: boolean;
}

export interface WorkOrderPaginationProps {
  count: number;
  start: number;
  end: number;
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (targetPage: number) => void;
}

export interface WorkOrderFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: WorkOrder | null;
  form: WorkOrderInput;
  setForm: Dispatch<SetStateAction<WorkOrderInput>>;
  onSubmit: (ev: FormEvent) => void;
  saving: boolean;
  equipmentOptions: { value: string; label: string }[];
  equipmentError: boolean;
  technicianOptions: { value: string; label: string }[];
}

export interface CompleteMaintenanceModalProps {
  completing: WorkOrder | null;
  onClose: () => void;
  isEngineer: boolean;
  completeFailSev: FailureSeverity;
  setCompleteFailSev: Dispatch<SetStateAction<FailureSeverity>>;
  completeFailDesc: string;
  completeObs: string;
  setCompleteObs: Dispatch<SetStateAction<string>>;
  completeStatus: WorkOrderStatus;
  setCompleteStatus: Dispatch<SetStateAction<WorkOrderStatus>>;
  maintenanceStatusOptions: (
    current: WorkOrderStatus,
  ) => { value: WorkOrderStatus; label: string }[];
  completeSaving: boolean;
  submitComplete: () => Promise<void>;
}
