import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { failuresService } from "@/services/failures.service";
import { equipmentService } from "@/services/equipment.service";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import type { Equipment } from "@/types/equipment/equipment";
import type { FailureInput, FailureReport } from "@/types/failure/failure";
import { PAGE_SIZE, empty } from "@/utils/failure.utils";
import { FailureHeader } from "@/pages/admin/failures/FailureHeader";
import { FailureFilters } from "@/pages/admin/failures/FailureFilters";
import { FailureTable } from "@/pages/admin/failures/FailureTable";
import { FailurePagination } from "@/pages/admin/failures/FailurePagination";
import { FailureFormModal } from "@/pages/admin/failures/FailureFormModal";
import { ResolveFailureModal } from "@/pages/admin/failures/ResolveFailureModal";
import type { Branch } from "@/types/equipment/branch";
import { branchesService } from "@/services/branches.service";


export function FallasPage() {
  const { usuario } = useAuth();
  const role = usuario?.role;
  const navigate = useNavigate();

  const [items, setItems] = useState<FailureReport[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [branches,setBranches] = useState<Branch[]>([]);
 
  // Si la carga (silenciosa) de equipos falla, lo avisamos en el <Select> del
  // formulario en vez de dejar un desplegable vacío sin explicación.
  const [equipmentError, setEquipmentError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [equipmentSearchOptions, setEquipmentSearchOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [severityFilter, setSeverityFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("");
  const [branchFilter,setBranchFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const [editing, setEditing] = useState<FailureReport | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FailureInput>(empty);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<FailureReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [resolveTarget, setResolveTarget] = useState<FailureReport | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const canCreate = can(role, "failures", "create");
  const canEdit = can(role, "failures", "edit");
  const canDelete = can(role, "failures", "delete");

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
        label: `${b.name} (${b.city})`
      })),
      [branches]
  )

  // Servicios disponibles: valores únicos de `equipment.area` (no hay catálogo
  // propio, es texto libre en Equipo), igual que se hace con los nombres en
  // Etiquetas QR.
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
  )

  const equipmentLabel = (id: number) => {
    const e = equipment.find((x) => x.id === id);
    return e ? `${e.name} (${e.asset_tag})` : `Equipo #${id}`;
  };

  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await failuresService.listPaginated({
        ordering: "-reported_at",
        search: search || undefined,
        severity: severityFilter || undefined,
        branch: branchFilter ? Number(branchFilter) : undefined,
        area: areaFilter || undefined,
        resolved:
          resolvedFilter === "true"
            ? true
            : resolvedFilter === "false"
              ? false
              : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setItems(data.results);
      setCount(data.count);
      setPage(targetPage);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las fallas"));
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
      .list({ordering:"name"})
      .then((setBranches))
      .catch(() => null);
    void load();
  },[]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(1);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, severityFilter, resolvedFilter,branchFilter, areaFilter]);

  const openCreate = () => {
    setForm({ ...empty, equipment: equipment[0]?.id ?? 0 });
    setCreating(true);
  };

  const openEdit = (f: FailureReport) => {
    setForm({
      equipment: f.equipment,
      description: f.description,
      severity: f.severity,
    });
    setEditing(f);
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
        await failuresService.update(editing.id, form);
      } else {
        await failuresService.create(form);
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
      await failuresService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setDeleting(false);
    }
  };

  const submitResolve = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      await failuresService.resolve(resolveTarget.id, resolveNotes || undefined);
      setResolveTarget(null);
      setResolveNotes("");
      if (role === "ingeniero") {
        navigate("/admin", { replace: true });
        return;
      }
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo resolver"));
    } finally {
      setResolving(false);
    }
  };

  const showActions = canCreate || canEdit || canDelete;
  const tableCols = 6 + (showActions ? 1 : 0);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <FailureHeader
        role={role}
        usuario={usuario}
      />

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
        <FailureFilters
          setSearch={setSearch}
          equipmentOptions={equipmentSearchOptions}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          resolvedFilter={resolvedFilter}
          setResolvedFilter={setResolvedFilter}
          branchFilter={branchFilter}
          setBranchFilter={setBranchFilter}
          branchOptions={branchOptions}
          areaFilter={areaFilter}
          setAreaFilter={setAreaFilter}
          areaOptions={areaOptions}
        />
        <FailureTable
          items={items}
          loading={loading}
          tableCols={tableCols}
          canEdit={canEdit}
          canDelete={canDelete}
          equipmentLabel={equipmentLabel}
          setResolveTarget={setResolveTarget}
          setResolveNotes={setResolveNotes}
          openEdit={openEdit}
          setToDelete={setToDelete}
          canCreate={canCreate}
          openCreate={openCreate}
        />
        </div>

        <FailurePagination
          count={count}
          start={start}
          end={end}
          page={page}
          totalPages={totalPages}
          loading={loading}
          load={load}
        />
      </Card>

      <FailureFormModal
        creating={creating}
        editing={editing}
        closeModal={closeModal}
        submit={submit}
        form={form}
        setForm={setForm}
        equipmentOptions={equipmentOptions}
        equipmentError={equipmentError}
        saving={saving}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar reporte"
        description="¿Eliminar este reporte de falla? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <ResolveFailureModal
        resolveTarget={resolveTarget}
        setResolveTarget={setResolveTarget}
        resolveNotes={resolveNotes}
        setResolveNotes={setResolveNotes}
        submitResolve={submitResolve}
        resolving={resolving}
      />
    </div>
  );
}
