import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { equipmentService } from "@/services/equipment.service";
import { resolveMediaUrl } from "@/lib/media";
import { maintenanceService } from "@/services/maintenance.service";
import { schedulingService } from "@/services/scheduling.service";
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import type { Equipment } from "@/types/equipment/equipment";
import type { MaintenanceRecord } from "@/types/maintenance/maintenance";
import type { ScheduledMaintenance } from "@/types/scheduling/scheduling";
import type { Tab } from "@/types/equipment/ficha";
import { FichaHeader } from "@/pages/admin/equipment/FichaHeader";
import { FichaTabs } from "@/pages/admin/equipment/FichaTabs";
import { FichaInfoTab } from "@/pages/admin/equipment/FichaInfoTab";
import { FichaHistoryTab } from "@/pages/admin/equipment/FichaHistoryTab";
import { FichaScheduledTab } from "@/pages/admin/equipment/FichaScheduledTab";

interface ContentProps {
  equipment: Equipment | null;
  branchName?: (id: number) => string;
  // Acciones opcionales según rol
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (eq: Equipment) => void;
  onDelete?: (eq: Equipment) => void;
}

interface Props extends ContentProps {
  open: boolean;
  onClose: () => void;
}


export function EquipoFicha({
  open,
  equipment,
  onClose,
  branchName,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Hoja de vida · ${equipment?.name ?? ""}`}
      size="xl"
    >
      <EquipoFichaContent
        equipment={equipment}
        branchName={branchName}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </Modal>
  );
}

export function EquipoFichaContent({
  equipment,
  branchName,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ContentProps) {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const navigate = useNavigate();
  // El ingeniero no ve el historial de mantenimientos ni las solicitudes: su
  // trabajo vive en "Órdenes de trabajo".
  const canVerHistorial = can(role, "maintenance", "view");
  const canVerProgramados = can(role, "scheduling", "view");

  const [tab, setTab] = useState<Tab>("info");
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMaintenance[]>([]);
  const [loadingH, setLoadingH] = useState(false);
  const [loadingS, setLoadingS] = useState(false);
  const [scheduledKind, setScheduledKind] = useState<string>("");
  const [eq, setEq] = useState<Equipment | null>(equipment);
  const [regeneratingQr, setRegeneratingQr] = useState(false);
  const [qrBust, setQrBust] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageBust, setImageBust] = useState(0);

  useEffect(() => {
    setEq(equipment);
    setTab("info");
    setHistory([]);
    setScheduled([]);
    setScheduledKind("");
    setQrBust(0);
    setImageBust(0);
    setImageError(null);
  }, [equipment]);

  useEffect(() => {
    if (!eq || !canVerHistorial) return;
    setLoadingH(true);
    maintenanceService
      .list({ equipment: eq.id, ordering: "-date" })
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingH(false));
  }, [eq, canVerHistorial]);

  useEffect(() => {
    if (!eq || !canVerProgramados) return;
    setLoadingS(true);
    schedulingService
      .list({
        equipment: eq.id,
        ordering: "scheduled_date",
        kind: scheduledKind || undefined,
      })
      .then(setScheduled)
      .catch(() => setScheduled([]))
      .finally(() => setLoadingS(false));
  }, [eq, scheduledKind, canVerProgramados]);

  if (!eq) return null;

  const branchLabel =
    eq.branch_name ?? (branchName ? branchName(eq.branch) : `Sede #${eq.branch}`);

  const mediaQr = resolveMediaUrl(eq.qr_code_url);
  const qrSrc = mediaQr
    ? qrBust
      ? `${mediaQr}${mediaQr.includes("?") ? "&" : "?"}v=${qrBust}`
      : mediaQr
    : null;

  const mediaImage = resolveMediaUrl(eq.equipment_image);
  const imageSrc = mediaImage
    ? imageBust
      ? `${mediaImage}${mediaImage.includes("?") ? "&" : "?"}v=${imageBust}`
      : mediaImage
    : null;

  const regenerateQr = async () => {
    setRegeneratingQr(true);
    try {
      const updated = await equipmentService.regenerateQr(eq.id);
      setEq(updated);
      setQrBust(Date.now());
    } catch {
      // El QR anterior sigue siendo válido; no bloqueamos la ficha.
    } finally {
      setRegeneratingQr(false);
    }
  };

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    setImageError(null);
    try {
      const updated = await equipmentService.updateImage(eq.id, file);
      setEq(updated);
      setImageBust(Date.now());
    } catch (err) {
      setImageError(
        getApiErrorMessage(err, "No se pudo guardar la imagen del equipo"),
      );
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const downloadQr = async () => {
    if (!qrSrc) return;
    try {
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${eq.asset_tag}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      if (qrSrc) window.open(qrSrc, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado: tarjeta con QR + info principal */}
      <FichaHeader
        qrSrc={qrSrc}
        eq={eq}
        downloadQr={downloadQr}
        canEdit={canEdit}
        regenerateQr={regenerateQr}
        regeneratingQr={regeneratingQr}
        canDelete={canDelete}
        role={role}
        onEdit={onEdit}
        onDelete={onDelete}
        navigate={navigate}
        branchLabel={branchLabel}
      />

        {/* Tabs */}
      <FichaTabs
        tab={tab}
        setTab={setTab}
        canVerHistorial={canVerHistorial}
        canVerProgramados={canVerProgramados}
      />

        {/* Tab content */}
        {tab === "info" && (
          <FichaInfoTab
            canVerHistorial={canVerHistorial}
            canVerProgramados={canVerProgramados}
            history={history}
            scheduled={scheduled}
            imageSrc={imageSrc}
            canEdit={canEdit}
            eq={eq}
            imageInputRef={imageInputRef}
            uploadImage={uploadImage}
            uploadingImage={uploadingImage}
            imageError={imageError}
          />
        )}

        {tab === "historial" && canVerHistorial && (
          <FichaHistoryTab loadingH={loadingH} history={history} />
        )}

        {tab === "programados" && canVerProgramados && (
          <FichaScheduledTab
            scheduledKind={scheduledKind}
            setScheduledKind={setScheduledKind}
            loadingS={loadingS}
            scheduled={scheduled}
          />
        )}
    </div>
  );
}
