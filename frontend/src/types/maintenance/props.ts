import type { Usuario, Rol } from "@/types/authentication/auth";
import type { MaintenanceInput, MaintenanceRecord } from "@/types/maintenance/maintenance";
import type { Dispatch, SetStateAction, FormEvent } from "react";

export interface MaintenanceHeaderProps {
  canCreate: boolean;
  onCreate: () => void;
}

export interface MaintenanceFilterProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  equipmentFilter: string;
  setEquipmentFilter: Dispatch<SetStateAction<string>>;
  equipmentOptions: { value: string; label: string }[];
  searchOptions: { value: string; label: string; hint?: string }[];
  kindFilter: string;
  setKindFilter: Dispatch<SetStateAction<string>>;
}

export interface MaintenanceRowProps {
  m: MaintenanceRecord;
  equipmentLabel: (id: number) => string;
  canEdit: boolean;
  canDelete: boolean;
  openEdit: (m: MaintenanceRecord) => void;
  setToDelete: Dispatch<SetStateAction<MaintenanceRecord | null>>;
  showActions?: boolean;
}

export interface MaintenanceTableProps extends Omit<MaintenanceRowProps, "m"> {
  items: MaintenanceRecord[];
  loading: boolean;
}

export interface MaintenancePaginationProps {
  count: number;
  start: number;
  end: number;
  page: number;
  totalPages: number;
  loading: boolean;
  load: (targetPage?: number) => Promise<void>;
}

export interface MaintenanceFormModalProps {
  creating: boolean;
  editing: MaintenanceRecord | null;
  closeModal: () => void;
  submit: (ev: FormEvent) => void;
  form: MaintenanceInput;
  setForm: Dispatch<SetStateAction<MaintenanceInput>>;
  equipmentOptions: { value: string; label: string }[];
  equipmentError: boolean;
  scheduleOptions: { value: string; label: string }[];
  technicianListAvailable: boolean;
  technicians: Usuario[];
  role: Rol | undefined;
  setPdf: Dispatch<SetStateAction<File | null>>;
  saving: boolean;
}
