import type { Equipment } from "@/types/equipment/equipment";
import type { MaintenanceRecord } from "@/types/maintenance/maintenance";
import type { ScheduledMaintenance } from "@/types/scheduling/scheduling";
import type { Dispatch, SetStateAction, RefObject } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { Rol } from "@/types/authentication/auth";

export type Tab = "info" | "historial" | "programados";

export interface FichaHeaderProps {
  qrSrc: string | null;
  eq: Equipment;
  downloadQr: () => Promise<void>;
  canEdit?: boolean;
  regenerateQr: () => Promise<void>;
  regeneratingQr: boolean;
  canDelete?: boolean;
  role: Rol | undefined;
  onEdit?: (eq: Equipment) => void;
  onDelete?: (eq: Equipment) => void;
  navigate: NavigateFunction;
  branchLabel: string;
}

export interface FichaTabsProps {
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  canVerHistorial: boolean;
  canVerProgramados: boolean;
}

export interface FichaInfoTabProps {
  canVerHistorial: boolean;
  canVerProgramados: boolean;
  history: MaintenanceRecord[];
  scheduled: ScheduledMaintenance[];
  imageSrc: string | null;
  canEdit?: boolean;
  eq: Equipment;
  imageInputRef: RefObject<HTMLInputElement | null>;
  uploadImage: (file: File) => Promise<void>;
  uploadingImage: boolean;
  imageError: string | null;
}

export interface FichaHistoryTabProps {
  loadingH: boolean;
  history: MaintenanceRecord[];
}

export interface FichaScheduledTabProps {
  scheduledKind: string;
  setScheduledKind: Dispatch<SetStateAction<string>>;
  loadingS: boolean;
  scheduled: ScheduledMaintenance[];
}
