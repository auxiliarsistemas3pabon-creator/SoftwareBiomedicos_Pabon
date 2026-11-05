import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { assignmentPayload } from "@/lib/users";
import { useAuth } from "@/context/AuthContext";
import { schedulingService } from "@/services/scheduling.service";
import { equipmentService } from "@/services/equipment.service";
import { branchesService } from "@/services/branches.service";
import { usersService } from "@/services/users.service";
import { workOrdersService } from "@/services/workorders.service";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { SchedulingHeader } from "@/pages/admin/scheduling/SchedulingHeader";
import { SchedulingFilters } from "@/pages/admin/scheduling/SchedulingFilters";
import { SchedulingTable } from "@/pages/admin/scheduling/SchedulingTable";
import { SchedulingPagination } from "@/pages/admin/scheduling/SchedulingPagination";
import { SchedulingDetailModal } from "@/pages/admin/scheduling/SchedulingDetailModal";
import { SchedulingFormModal } from "@/pages/admin/scheduling/SchedulingFormModal";
import {
  PAGE_SIZE,
  TECHNICIAN_ROLES,
  empty,
  today,
} from "@/utils/scheduling.utils";
import type { Equipment } from "@/types/equipment/equipment";
import type { Branch } from "@/types/equipment/branch";
import type { Usuario } from "@/types/authentication/auth";
import type { ScheduledMaintenance } from "@/types/scheduling/scheduling";
import type { WorkOrderDetail } from "@/types/equipment/workorder";
import type { FormState } from "@/types/scheduling/form";

export function AgendamientosPage() {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const navigate = useNavigate();

  const [items, setItems] = useState<ScheduledMaintenance[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  // La lista de equipos se carga aparte y en silencio; si falla, avisamos en
  // el <Select> del formulario para que no quede un desplegable vacío sin
  // explicación.
  const [equipmentError, setEquipmentError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [equipmentSearchOptions, setEquipmentSearchOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [completedFilter, setCompletedFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const [editing, setEditing] = useState<ScheduledMaintenance | null>(null);
  const [viewing, setViewing] = useState<ScheduledMaintenance | null>(null);
  const [woDetail, setWoDetail] = useState<WorkOrderDetail | null>(null);
  const [woLoading, setWoLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<ScheduledMaintenance | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [technicians, setTechnicians] = useState<Usuario[]>([]);
  const [technicianListAvailable, setTechnicianListAvailable] = useState(false);

  const canCreate = can(role, "scheduling", "create");
  const canEdit = can(role, "scheduling", "edit");
  const canDelete = can(role, "scheduling", "delete");
  const showRequestingArea = role === "superadmin" || role === "ingeniero";
  const tableColSpan = showRequestingArea ? 9 : 8;
  const isCoordinatorOrSuperadmin =
    role === "coordinador" || role === "superadmin";
  const canRegisterMaintenance = can(role, "maintenance", "create");
  // Solo el ingeniero/técnico ejecuta la orden de trabajo; la gestión hace
  // seguimiento por el estado de la solicitud.
  const canOpenWorkOrder = role === "ingeniero";

  const workOrderId = viewing?.work_order?.id;
  useEffect(() => {
    if (!canOpenWorkOrder || !workOrderId) {
      setWoDetail(null);
      return;
    }
    let cancelled = false;
    setWoLoading(true);
    workOrdersService
      .details(workOrderId)
      .then((d) => {
        if (!cancelled) setWoDetail(d);
      })
      .catch(() => {
        if (!cancelled) setWoDetail(null);
      })
      .finally(() => {
        if (!cancelled) setWoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canOpenWorkOrder, workOrderId]);

  const equipmentOptions = useMemo(
    () =>
      equipment.map((e) => ({
        value: String(e.id),
        label: `${e.name} (${e.asset_tag})`,
      })),
    [equipment],
  );

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        value: String(b.id),
        label: `${b.name} (${b.city})`,
      })),
    [branches],
  );

  // Servicios disponibles: valores únicos de `equipment.area` (no hay
  // catálogo propio, es texto libre en Equipo), igual que en Reportes de falla.
  const areaOptions = useMemo(
    () =>
      Array.from(
        new Set(
          equipment
            .map((e) => (e.area || "").trim())
            .filter((a) => a.length > 0),
        ),
      )
        .sort((a, b) => a.localeCompare(b, "es"))
        .map((a) => ({ value: a, label: a })),
    [equipment],
  );

  const equipmentLabel = (id: number) => {
    const e = equipment.find((x) => x.id === id);
    return e ? `${e.name} (${e.asset_tag})` : `Equipo #${id}`;
  };

  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await schedulingService.listPaginated({
        ordering: "-requested_date",
        search: search || undefined,
        branch: branchFilter ? Number(branchFilter) : undefined,
        area: areaFilter || undefined,
        is_completed:
          completedFilter === "true"
            ? true
            : completedFilter === "false"
              ? false
              : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setItems(data.results);
      setCount(data.count);
      setPage(targetPage);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las solicitudes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    equipmentService
      .list({ ordering: "name" })
      .then((data) => {
        setEquipment(data);
        setEquipmentError(false);
      })
      .catch(() => setEquipmentError(true));
    equipmentService
      .listAll({ ordering: "name" })
      .then((data) => {
        const seen = new Set<string>();
        const options: { value: string; label: string }[] = [];
        for (const e of data) {
          const label = e.name.trim();
          if (!label) continue;
          const key = label.toLocaleLowerCase("es");
          if (seen.has(key)) continue;
          seen.add(key);
          options.push({ value: key, label });
        }
        options.sort((a, b) => a.label.localeCompare(b.label, "es"));
        setEquipmentSearchOptions(options);
      })
      .catch(() => setEquipmentSearchOptions([]));
  }, []);

  useEffect(() => {
    branchesService
      .list({ ordering: "name" })
      .then(setBranches)
      .catch(() => null);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(1);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, completedFilter, branchFilter, areaFilter]);

  // Coordinador e ingeniero pueden listar ingenieros/operativos activos
  // (selector de responsable). Admin ve el catálogo completo.
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
    setForm({
      ...empty,
      equipment: equipment[0]?.id ?? 0,
      requested_date: today(),
    });
    setCreating(true);
  };

  const openEdit = (s: ScheduledMaintenance) => {
    setForm({
      equipment: s.equipment,
      kind: s.kind,
      requested_date: s.requested_date,
      scheduled_date: s.scheduled_date ?? "",
      notes: s.notes ?? "",
      assigned_technician: s.assigned_technician ?? null,
      assigned_engineer: s.assigned_engineer ?? null,
    });
    setEditing(s);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(empty);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const assignedUser = technicians.find(
          (u) =>
            u.id === form.assigned_technician ||
            u.id === form.assigned_engineer,
        );
        await schedulingService.update(editing.id, {
          scheduled_date: form.scheduled_date || null,
          notes: form.notes,
          ...(technicianListAvailable
            ? assignmentPayload(assignedUser ?? null)
            : {
                assigned_technician: form.assigned_technician,
                assigned_engineer: form.assigned_engineer,
              }),
        });
      } else {
        await schedulingService.create({
          equipment: form.equipment,
          kind: form.kind,
          requested_date: form.requested_date || today(),
          notes: form.notes,
        });
      }
      closeModal();
      await load();
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
      await schedulingService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setDeleting(false);
    }
  };

  const completeOne = async (s: ScheduledMaintenance) => {
    try {
      await schedulingService.complete(s.id);
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo marcar como cumplida"));
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <SchedulingHeader role={role} />

      <Card padding="none">
        {error && (
          <div
            role="alert"
            className="m-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}
        <div className="w-full min-w-0 overflow-x-auto">
        <SchedulingFilters
          onSearchChange={setSearch}
          equipmentOptions={equipmentSearchOptions}
          completedFilter={completedFilter}
          onCompletedFilterChange={setCompletedFilter}
          branchFilter={branchFilter}
          onBranchFilterChange={setBranchFilter}
          branchOptions={branchOptions}
          areaFilter={areaFilter}
          onAreaFilterChange={setAreaFilter}
          areaOptions={areaOptions}
        />
        <SchedulingTable
          items={items}
          loading={loading}
          tableColSpan={tableColSpan}
          showRequestingArea={showRequestingArea}
          equipmentLabel={equipmentLabel}
          canOpenWorkOrder={canOpenWorkOrder}
          canRegisterMaintenance={canRegisterMaintenance}
          canEdit={canEdit}
          canDelete={canDelete}
          onView={setViewing}
          onOpenWorkOrders={() => navigate("/admin/ordenes-trabajo")}
          onRegisterMaintenance={(s) =>
            navigate(`/admin/mantenimientos?scheduling=${s.id}`)
          }
          onComplete={(s) => void completeOne(s)}
          onEdit={openEdit}
          onDelete={setToDelete}
          canCreate={canCreate}
          onCreate={openCreate}
        />
        </div>

        <SchedulingPagination
          count={count}
          start={start}
          end={end}
          page={page}
          totalPages={totalPages}
          loading={loading}
          onPageChange={(targetPage) => void load(targetPage)}
        />
      </Card>

      <SchedulingDetailModal
        viewing={viewing}
        onClose={() => setViewing(null)}
        canOpenWorkOrder={canOpenWorkOrder}
        workOrderId={workOrderId}
        woLoading={woLoading}
        woDetail={woDetail}
        showRequestingArea={showRequestingArea}
        equipmentLabel={equipmentLabel}
      />

      <SchedulingFormModal
        open={creating || !!editing}
        onClose={closeModal}
        editing={editing}
        creating={creating}
        isCoordinatorOrSuperadmin={isCoordinatorOrSuperadmin}
        form={form}
        setForm={setForm}
        onSubmit={submit}
        saving={saving}
        equipmentLabel={equipmentLabel}
        equipmentOptions={equipmentOptions}
        equipmentError={equipmentError}
        technicianListAvailable={technicianListAvailable}
        technicians={technicians}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Cancelar solicitud"
        description="¿Eliminar esta solicitud? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
