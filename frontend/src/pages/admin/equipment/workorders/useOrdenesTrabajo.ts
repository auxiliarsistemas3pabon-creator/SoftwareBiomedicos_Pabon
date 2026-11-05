import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { workOrdersService } from "@/services/workorders.service";
import { equipmentService } from "@/services/equipment.service";
import { usersService } from "@/services/users.service";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import type { Equipment } from "@/types/equipment/equipment";
import type { Usuario } from "@/types/authentication/auth";
import type { FailureSeverity } from "@/types/failure/failure";
import type {
  WorkOrder,
  WorkOrderDetail,
  WorkOrderInput,
  WorkOrderStatus,
} from "@/types/equipment/workorder";
import { PAGE_SIZE, emptyForm, today } from "@/utils/workorder.utils";

export function useOrdenesTrabajo() {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const isEngineer = role === "ingeniero";
  const canCreate = can(role, "work_orders", "create");
  const canEdit = can(role, "work_orders", "edit");
  const canDelete = can(role, "work_orders", "delete");

  const [items, setItems] = useState<WorkOrder[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  // Si la carga (silenciosa) de equipos falla, lo avisamos en el <Select> del
  // formulario en vez de dejar un desplegable vacío sin explicación.
  const [equipmentError, setEquipmentError] = useState(false);
  const [technicians, setTechnicians] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [orderOptions, setOrderOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [equipmentSearchOptions, setEquipmentSearchOptions] = useState<
    { value: string; label: string; hint?: string }[]
  >([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<WorkOrderInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  // "Realizar mantenimiento": el responsable cierra su orden y queda el
  // registro en la hoja de vida del equipo.
  const [completing, setCompleting] = useState<WorkOrder | null>(null);
  const [completeObs, setCompleteObs] = useState("");
  const [completeFailDesc, setCompleteFailDesc] = useState("");
  const [completeFailSev, setCompleteFailSev] =
    useState<FailureSeverity>("MEDIUM");
  const [completeSaving, setCompleteSaving] = useState(false);
  const [completeStatus, setCompleteStatus] =
    useState<WorkOrderStatus>("IN_PROGRESS");

  const [detail, setDetail] = useState<WorkOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const equipmentOptions = useMemo(
    () =>
      equipment.map((e) => ({
        value: String(e.id),
        label: `${e.name} (${e.asset_tag})`,
      })),
    [equipment],
  );

  const technicianOptions = useMemo(
    () => [
      { value: "", label: "Sin asignar" },
      ...technicians
        .filter((u) => u.role === "tecnico" || u.role === "ingeniero")
        .map((u) => ({
          value: String(u.id),
          label: `${`${u.first_name} ${u.last_name}`.trim() || u.username}`,
        })),
    ],
    [technicians],
  );

  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await workOrdersService.listPaginated({
        ordering: "-start_date",
        search: search || undefined,
        equipment_name: equipmentFilter || undefined,
        status: statusFilter || undefined,
        service_type: typeFilter || undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setItems(data.results);
      setCount(data.count);
      setPage(targetPage);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las órdenes"));
    } finally {
      setLoading(false);
    }
  };

  const loadOrderOptions = async () => {
    try {
      const all = await workOrdersService.listAll({ ordering: "-start_date" });
      const seen = new Set<string>();
      const options: { value: string; label: string }[] = [];
      for (const w of all) {
        const label = w.number.trim();
        if (!label) continue;
        const key = label.toLocaleLowerCase("es");
        if (seen.has(key)) continue;
        seen.add(key);
        options.push({ value: key, label });
      }
      options.sort((a, b) => a.label.localeCompare(b.label, "es"));
      setOrderOptions(options);
    } catch {
      // El listado paginado sigue funcionando aunque falle el buscador.
    }
  };

  useEffect(() => {
    void Promise.all([
      equipmentService
        .list({ ordering: "name" })
        .then((data) => {
          setEquipment(data);
          setEquipmentError(false);
        })
        .catch(() => setEquipmentError(true)),
      equipmentService
        .listAll({ ordering: "name" })
        .then((data) => {
          setEquipmentSearchOptions(
            data
              .map((e) => ({
                value: String(e.id),
                label: e.name,
                hint: e.asset_tag,
              }))
              .sort(
                (a, b) =>
                  a.label.localeCompare(b.label, "es") ||
                  (a.hint ?? "").localeCompare(b.hint ?? "", "es"),
              ),
          );
        })
        .catch(() => setEquipmentSearchOptions([])),
      usersService
        .list({ is_active: true })
        .then(setTechnicians)
        .catch(() => setTechnicians([])),
    ]);
    void loadOrderOptions();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(1);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, equipmentFilter, statusFilter, typeFilter]);

  const openCreate = () => {
    setForm({
      ...emptyForm,
      start_date: today(),
      equipment: equipment[0]?.id ?? 0,
    });
    setCreating(true);
  };

  const openEdit = (w: WorkOrder) => {
    setForm({
      equipment: w.equipment,
      number: w.number,
      service_type: w.service_type,
      start_date: w.start_date?.slice(0, 16) ?? today(),
      end_date: w.end_date?.slice(0, 16) ?? "",
      description: w.description,
      technician: w.technician ?? null,
      status: w.status,
    });
    setEditing(w);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload: WorkOrderInput = {
        ...form,
        end_date: form.end_date ? form.end_date : null,
        technician: form.technician || null,
      };
      if (editing) {
        await workOrdersService.update(editing.id, payload);
      } else {
        await workOrdersService.create(payload);
      }
      closeModal();
      await load();
      void loadOrderOptions();
    } catch (err) {
      alert(getApiErrorMessage(err, "Error al guardar"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await workOrdersService.remove(toDelete.id);
      setToDelete(null);
      await load();
      void loadOrderOptions();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setDeleting(false);
    }
  };

  const openComplete = (w: WorkOrder) => {
    setCompleteObs("");
    setCompleteFailDesc(w.description ?? "");
    setCompleteFailSev("MEDIUM");
    setCompleteStatus(
      w.status === "PENDING" ? "IN_PROGRESS" : w.status,
    );
    setCompleting(w);
  };

  const maintenanceStatusOptions = (current: WorkOrderStatus) => {
    const opts: { value: WorkOrderStatus; label: string }[] = [
      { value: "PENDING", label: "Pendiente" },
      { value: "IN_PROGRESS", label: "En proceso" },
    ];
    if (current === "IN_PROGRESS" || !isEngineer) {
      opts.push({ value: "FINISHED", label: "Finalizar" });
    }
    return opts;
  };

  const submitComplete = async () => {
    if (!completing) return;
    const notes = completeObs.trim();
    if (!notes) {
      alert("La nota de resolución es obligatoria.");
      return;
    }
    if (
      isEngineer &&
      completing.status === "PENDING" &&
      completeStatus === "FINISHED"
    ) {
      alert(
        "Primero pasa la orden a En proceso. No se puede finalizar de una.",
      );
      return;
    }
    setCompleteSaving(true);
    try {
      if (completeStatus === "FINISHED") {
        await workOrdersService.complete(completing.id, {
          observations: notes,
          status: "FINISHED",
          ...(isEngineer
            ? {
                failure_description: completeFailDesc.trim() || completing.description,
                failure_severity: completeFailSev,
                failure_resolution_notes: notes,
              }
            : {}),
        });
      } else {
        await workOrdersService.complete(completing.id, {
          observations: notes,
          status: completeStatus,
        });
      }
      setCompleting(null);
      setCompleteObs("");
      setCompleteFailDesc("");
      setDetail(null);
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo registrar el mantenimiento"));
    } finally {
      setCompleteSaving(false);
    }
  };

  const openDetail = async (w: WorkOrder) => {
    setDetail(null);
    setDetailLoading(true);
    try {
      const full = await workOrdersService.details(w.id);
      setDetail(full);
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo cargar el detalle"));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const reloadDetail = async () => {
    if (!detail) return;
    setDetail(await workOrdersService.details(detail.id));
    await load();
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);

  return {
    isEngineer,
    canCreate,
    canEdit,
    canDelete,
    items,
    count,
    page,
    equipmentError,
    loading,
    error,
    search,
    setSearch,
    orderOptions,
    equipmentSearchOptions,
    setEquipmentFilter,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    editing,
    creating,
    form,
    setForm,
    saving,
    toDelete,
    setToDelete,
    deleting,
    completing,
    setCompleting,
    completeObs,
    setCompleteObs,
    completeFailDesc,
    completeFailSev,
    setCompleteFailSev,
    completeSaving,
    completeStatus,
    setCompleteStatus,
    detail,
    setDetail,
    detailLoading,
    equipmentOptions,
    technicianOptions,
    load,
    openCreate,
    openEdit,
    closeModal,
    submit,
    confirmDelete,
    openComplete,
    maintenanceStatusOptions,
    submitComplete,
    openDetail,
    reloadDetail,
    totalPages,
    start,
    end,
  };
}
