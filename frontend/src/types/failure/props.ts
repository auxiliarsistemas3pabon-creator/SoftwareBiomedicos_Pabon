import type { FailureInput, FailureReport } from "@/types/failure/failure";
import type { Dispatch, SetStateAction, FormEvent } from "react";
import type { Rol, Usuario } from "@/types/authentication/auth";

type SelectOption = {value:string; label:string};

export interface FailureHeaderProps {
  role: Rol | undefined;
  usuario: Usuario | null;
}

export interface FailureFiltersProps {
  setSearch: Dispatch<SetStateAction<string>>;
  equipmentOptions: { value: string; label: string; hint?: string }[];
  severityFilter: string;
  setSeverityFilter: Dispatch<SetStateAction<string>>;
  resolvedFilter: string;
  setResolvedFilter: Dispatch<SetStateAction<string>>;
  branchFilter: string;
  setBranchFilter: Dispatch<SetStateAction<string>>;
  branchOptions: SelectOption[];
  areaFilter: string;
  setAreaFilter: Dispatch<SetStateAction<string>>;
  areaOptions: SelectOption[];
}

export interface FailureRowProps {
  f: FailureReport;
  canEdit: boolean;
  canDelete: boolean;
  equipmentLabel: (id: number) => string;
  setResolveTarget: Dispatch<SetStateAction<FailureReport | null>>;
  setResolveNotes: Dispatch<SetStateAction<string>>;
  openEdit: (f: FailureReport) => void;
  setToDelete: Dispatch<SetStateAction<FailureReport | null>>;
  canCreate: boolean;
  openCreate: () => void;
}

export interface FailureTableProps extends Omit<FailureRowProps, "f"> {
  items: FailureReport[];
  loading: boolean;
  tableCols: number;
}

export interface FailurePaginationProps {
  count: number;
  start: number;
  end: number;
  page: number;
  totalPages: number;
  loading: boolean;
  load: (targetPage?: number) => Promise<void>;
}

export interface FailureFormModalProps {
  creating: boolean;
  editing: FailureReport | null;
  closeModal: () => void;
  submit: (ev: FormEvent) => void;
  form: FailureInput;
  setForm: Dispatch<SetStateAction<FailureInput>>;
  equipmentOptions: { value: string; label: string }[];
  equipmentError: boolean;
  saving: boolean;
}

export interface ResolveFailureModalProps {
  resolveTarget: FailureReport | null;
  setResolveTarget: Dispatch<SetStateAction<FailureReport | null>>;
  resolveNotes: string;
  setResolveNotes: Dispatch<SetStateAction<string>>;
  submitResolve: () => Promise<void>;
  resolving: boolean;
}
