import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { maintenanceService } from "@/services/maintenance.service";
import { equipmentService } from "@/services/equipment.service";
import { schedulingService } from "@/services/scheduling.service";
import { usersService } from "@/services/users.service";
import { can } from "@/lib/permissions";
import { assignedUserName } from "@/lib/users";
import { getApiErrorMessage } from "@/lib/api";
import type { Equipment } from "@/types/equipment/equipment";
import type { Usuario } from "@/types/authentication/auth";
import type { MaintenanceInput, MaintenanceRecord } from "@/types/maintenance/maintenance";
import type { ScheduledMaintenance } from "@/types/scheduling/scheduling";
import { PAGE_SIZE, TECHNICIAN_ROLES, empty } from "@/utils/maintenance.utils";

export function useMantenimientos() {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<MaintenanceRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  // Si la carga (silenciosa) de equipos falla, lo avisamos en el <Select> del
  // formulario en vez de dejar un desplegable vacío sin explicación.
  const [equipmentError, setEquipmentError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [searchOptions, setSearchOptions] = useState<
    { value: string; label: string; hint?: string }[]
  >([]);

  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MaintenanceInput>(empty);
  const [pdf, setPdf] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<MaintenanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [technicians, setTechnicians] = useState<Usuario[]>([]);
  const [technicianListAvailable, setTechnicianListAvailable] = useState(false);

  const [pendingSchedules, setPendingSchedules] = useState<ScheduledMaintenance[]>(
    [],
  );

  const canCreate = can(role, "maintenance", "create");
  const canEdit = can(role, "maintenance", "edit");
  const canDelete = can(role, "maintenance", "delete");

  const equipmentOptions = useMemo(
    () =>
      equipment.map((e) => ({
        value: String(e.id),
        label: e.name,
        hint: e.asset_tag,
      })),
    [equipment],
  );

  const equipmentLabel = (id: number) => {
    const e = equipment.find((x) => x.id === id);
    return e ? `${e.name} (${e.asset_tag})` : `Equipo #${id}`;
  };

  // Opciones de agendamientos pendientes para el equipo actual del formulario.
  // Si se está editando y el agendamiento vinculado ya quedó cumplido (porque
  // el backend lo cerró al crear este mantenimiento), se inyecta a mano para
  // que el select no quede vacío.
  const scheduleOptions = useMemo(() => {
    const list = pendingSchedules.filter((s) => s.equipment === form.equipment);
    if (
      editing?.scheduled_maintenance &&
      editing.scheduled_maintenance_detail &&
      !list.some((s) => s.id === editing.scheduled_maintenance)
    ) {
      list.unshift(editing.scheduled_maintenance_detail);
    }
    return list.map((s) => ({
      value: String(s.id),
      label: `${s.scheduled_date ?? "Sin fecha"} · ${s.kind === "PREVENTIVE" ? "Preventivo" : "Reparación"}${s.notes ? ` — ${s.notes}` : ""}`,
    }));
  }, [pendingSchedules, form.equipment, editing]);

  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await maintenanceService.listPaginated({
        ordering: "-date",
        search: search || undefined,
        kind: kindFilter || undefined,
        equipment_name: equipmentFilter || undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setItems(data.results);
      setCount(data.count);
      setPage(targetPage);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar los mantenimientos"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      // listAll, no list: con más de una página de equipos, list() solo trae
      // la primera y al editar un mantenimiento cuyo equipo cae en otra
      // página, el <Select> no lo encuentra y queda sin mostrar el equipo.
      equipmentService
        .listAll({ ordering: "name" })
        .then((data) => {
          setEquipment(data);
          setEquipmentError(false);
        })
        .catch(() => setEquipmentError(true)),
      schedulingService
        .list({ is_completed: false, ordering: "scheduled_date" })
        .then(setPendingSchedules)
        .catch(() => null),
    ]);
    void loadSearchOptions();
  }, []);

  const loadSearchOptions = async () => {
    try {
      const all = await maintenanceService.listAll({ ordering: "-date" });
      const seen = new Set<string>();
      const options: { value: string; label: string }[] = [];
      for (const m of all) {
        const label =
          assignedUserName(m.assigned_technician_detail) ||
          assignedUserName(m.assigned_engineer_detail) ||
          m.technician?.trim() ||
          "";
        if (!label) continue;
        const key = label.toLocaleLowerCase("es");
        if (seen.has(key)) continue;
        seen.add(key);
        options.push({ value: key, label });
      }
      options.sort((a, b) => a.label.localeCompare(b.label, "es"));
      setSearchOptions(options);
    } catch {
      // El listado paginado sigue funcionando aunque falle el buscador.
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(1);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kindFilter, equipmentFilter]);

  // Si entramos desde "Realizar mantenimiento" de un agendamiento, abrimos
  // el modal pre-llenado con sus datos (equipo, tipo, asignado, FK) y la
  // fecha de hoy como ejecución. El parámetro se limpia al cerrar o guardar.
  useEffect(() => {
    const idStr = searchParams.get("scheduling");
    if (!idStr) return;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await schedulingService.retrieve(id);
        if (cancelled) return;
        if (s.is_completed) {
          alert("Ese agendamiento ya fue cumplido.");
          setSearchParams({}, { replace: true });
          return;
        }
        setPendingSchedules((prev) =>
          prev.some((p) => p.id === s.id) ? prev : [s, ...prev],
        );
        setForm({
          equipment: s.equipment,
          kind: s.kind,
          date: new Date().toISOString().slice(0, 10),
          description: s.notes ?? "",
          observations: "",
          assigned_technician: s.assigned_technician ?? null,
          assigned_engineer: s.assigned_engineer ?? null,
          cost: "",
          scheduled_maintenance: s.id,
        });
        setPdf(null);
        setCreating(true);
      } catch (err) {
        alert(getApiErrorMessage(err, "No se pudo cargar el agendamiento"));
        setSearchParams({}, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  // Si entramos desde "Nuevo mantenimiento" en la lista de equipos
  // (?equipment=ID), abrimos el modal de creación con ese equipo ya elegido.
  // El parámetro se limpia al cerrar o guardar.
  useEffect(() => {
    const idStr = searchParams.get("equipment");
    if (!idStr || !canCreate) return;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm({ ...empty, equipment: id });
    setPdf(null);
    setCreating(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams, canCreate]);

  // Carga la lista de técnicos disponibles. Si el usuario no tiene permiso
  // para listar usuarios (coordinador/ingeniero), simplemente no se muestra
  // el select y volvemos al input de texto libre.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lists = await Promise.all(
          TECHNICIAN_ROLES.map((r) =>
            usersService.list({ role: r, is_active: true, ordering: "first_name" }),
          ),
        );
        if (cancelled) return;
        const flat = lists.flat();
        // Dedup por id
        const map = new Map<number, Usuario>();
        flat.forEach((u) => map.set(u.id, u));
        setTechnicians(Array.from(map.values()));
        setTechnicianListAvailable(true);
      } catch {
        if (!cancelled) {
          setTechnicians([]);
          setTechnicianListAvailable(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  const openCreate = () => {
    setForm({ ...empty, equipment: equipment[0]?.id ?? 0 });
    setPdf(null);
    setCreating(true);
  };

  const openEdit = (m: MaintenanceRecord) => {
    setForm({
      equipment: m.equipment,
      kind: m.kind,
      date: m.date,
      description: m.description,
      observations: m.observations ?? "",
      assigned_technician: m.assigned_technician ?? null,
      assigned_engineer: m.assigned_engineer ?? null,
      cost: m.cost ?? "",
      scheduled_maintenance: m.scheduled_maintenance ?? null,
    });
    setPdf(null);
    setEditing(m);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(empty);
    setPdf(null);
    if (searchParams.get("scheduling") || searchParams.get("equipment")) {
      setSearchParams({}, { replace: true });
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await maintenanceService.update(editing.id, form);
      } else if (pdf) {
        await maintenanceService.createWithFile(form, pdf);
      } else {
        await maintenanceService.create(form);
      }
      closeModal();
      await Promise.all([
        load(),
        schedulingService
          .list({ is_completed: false, ordering: "scheduled_date" })
          .then(setPendingSchedules)
          .catch(() => null),
      ]);
      await loadSearchOptions();
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
      await maintenanceService.remove(toDelete.id);
      setToDelete(null);
      await load();
      await loadSearchOptions();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);

  return {
    role,
    items,
    count,
    page,
    equipmentError,
    loading,
    error,
    search,
    setSearch,
    kindFilter,
    setKindFilter,
    equipmentFilter,
    setEquipmentFilter,
    editing,
    creating,
    form,
    setForm,
    setPdf,
    saving,
    toDelete,
    setToDelete,
    deleting,
    technicians,
    technicianListAvailable,
    canCreate,
    canEdit,
    canDelete,
    equipmentOptions,
    searchOptions,
    equipmentLabel,
    scheduleOptions,
    load,
    openCreate,
    openEdit,
    closeModal,
    submit,
    confirmDelete,
    totalPages,
    start,
    end,
  };
}
