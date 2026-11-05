import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconHint } from "@/components/ui/IconHint";
import { Card } from "@/components/ui/Card";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { branchesService } from "@/services/branches.service";
import { can } from "@/lib/permissions";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api";
import { startsWithLetter } from "@/utils/equipment.names.utils";
import type { Branch, BranchInput } from "@/types/equipment/branch";

const empty: BranchInput = {
  name: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  is_active: true,
};

// Mismo formato que valida el backend (apps/branches/models.py): opcional "+",
// luego 7-20 dígitos / espacios / guiones / paréntesis.
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

/** Valida en el cliente lo mismo que el backend, para no gastar un viaje al
 *  servidor y decir exactamente qué campo falla. */
const PAGE_SIZE = 6;

function validateBranch(form: BranchInput): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.name.trim()) errs.name = "El nombre es obligatorio.";
  if (!form.address.trim()) errs.address = "La dirección es obligatoria.";
  if (!form.city.trim()) errs.city = "La ciudad es obligatoria.";
  if (!form.phone?.trim()) {
    errs.phone = "El teléfono es obligatorio.";
  } else if (!PHONE_RE.test(form.phone.trim())) {
    errs.phone = "Formato no válido. Ej.: +57 300 123 4567";
  }
  return errs;
}

export function SedesPage() {
  const { usuario } = useAuth();
  const role = usuario?.role;

  const [allItems, setAllItems] = useState<Branch[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BranchInput>(empty);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = can(role, "branches", "create");
  const canEdit = can(role, "branches", "edit");
  const canDelete = can(role, "branches", "delete");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAllItems(await branchesService.listAll({ ordering: "name" }));
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar las sedes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Actualiza el formulario y limpia el error del/los campo(s) tocado(s).
  const update = (patch: Partial<BranchInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setFieldErrors((fe) => {
      if (Object.keys(fe).length === 0) return fe;
      const next = { ...fe };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const openCreate = () => {
    setForm(empty);
    setFieldErrors({});
    setCreating(true);
  };

  const openEdit = (b: Branch) => {
    setForm({
      name: b.name,
      address: b.address,
      city: b.city,
      phone: b.phone ?? "",
      email: b.email ?? "",
      is_active: b.is_active,
    });
    setFieldErrors({});
    setEditing(b);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(empty);
    setFieldErrors({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clientErrors = validateBranch(form);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await branchesService.update(editing.id, form);
      } else {
        await branchesService.create(form);
      }
      closeModal();
      await load();
    } catch (err) {
      // Si el backend devolvió errores por campo (formato de teléfono, nombre
      // duplicado…), se muestran debajo del input correspondiente en vez de
      // un alert sin contexto.
      const apiErrors = getApiFieldErrors(err);
      if (Object.keys(apiErrors).length > 0) {
        setFieldErrors(apiErrors);
      } else {
        alert(getApiErrorMessage(err, "Error al guardar"));
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await branchesService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setDeleting(false);
    }
  };

  const nameOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    for (const b of allItems) {
      const label = b.name.trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase("es");
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({ value: key, label });
    }
    options.sort((a, b) => a.label.localeCompare(b.label, "es"));
    return options;
  }, [allItems]);

  const filtered = useMemo(
    () =>
      allItems.filter(
        (b) => !search.trim() || startsWithLetter(b.name, search),
      ),
    [allItems, search],
  );

  const count = filtered.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = count === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, count);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-app">Sedes</h1>
          <p className="text-sm text-app-muted">
            Administra las sedes (centros) de la institución.
          </p>
        </div>
      </div>

      <Card>
        <div className="mb-4 max-w-sm">
          <Combobox
            options={nameOptions}
            onQueryChange={setSearch}
            onSelect={(opt) => setSearch(opt?.label ?? "")}
            placeholder="Buscar sede..."
            ariaLabel="Buscar sede por nombre"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
                <th className="whitespace-nowrap pb-2 pl-4 pr-10 text-left font-medium">Sede</th>
                <th className="whitespace-nowrap pb-2 pl-10 pr-10 text-center font-medium">Ciudad</th>
                <th className="whitespace-nowrap pb-2 pl-10 pr-10 text-center font-medium">Contacto</th>
                <th className="whitespace-nowrap pb-2 pl-10 pr-14 text-center font-medium">Estado</th>
                <th className="whitespace-nowrap pb-2 pl-14 pr-4 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-app-muted">
                    Cargando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-app-muted">
                    No hay sedes registradas.
                  </td>
                </tr>
              ) : (
                items.map((b) => (
                  <tr key={b.id} className="text-app">
                    <td className="whitespace-nowrap py-3 pl-4 pr-10 text-left">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 size={14} />
                        </span>
                        <div>
                          <p className="whitespace-nowrap font-medium">{b.name}</p>
                          <p className="whitespace-nowrap text-xs text-app-muted">{b.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pl-10 pr-10 text-center text-app-muted">{b.city}</td>
                    <td className="whitespace-nowrap py-3 pl-10 pr-10 text-center text-app-muted">
                      <p>{b.phone || "—"}</p>
                      <p className="text-xs">{b.email || ""}</p>
                    </td>
                    <td className="whitespace-nowrap py-3 pl-10 pr-14 text-center">
                      <Badge tone={b.is_active ? "success" : "neutral"}>
                        {b.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </td>
                    <td className="py-3 pl-14 pr-4 text-center">
                      <div className="flex flex-nowrap items-center justify-center gap-2">
                        {canCreate && (
                          <IconHint label="Nueva sede">
                            <Button
                              size="sm"
                              className="h-8! w-8! px-0!"
                              aria-label="Nueva sede"
                              onClick={openCreate}
                            >
                              <Landmark size={14} />
                            </Button>
                          </IconHint>
                        )}
                        {canEdit && (
                          <IconHint label="Editar">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8! w-8! px-0!"
                              aria-label="Editar"
                              onClick={() => openEdit(b)}
                            >
                              <Pencil size={14} />
                            </Button>
                          </IconHint>
                        )}
                        {canDelete && (
                          <IconHint label="Eliminar">
                            <Button
                              size="sm"
                              variant="danger"
                              className="h-8! w-8! px-0!"
                              aria-label="Eliminar"
                              onClick={() => setToDelete(b)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </IconHint>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-app pt-3 text-xs text-app-muted">
          <p>
            {count === 0
              ? "Sin resultados"
              : `Mostrando ${start}–${end} de ${count}`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<ChevronLeft size={14} />}
              disabled={safePage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="px-2 text-app">
              {safePage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              rightIcon={<ChevronRight size={14} />}
              disabled={safePage >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={creating || !!editing}
        onClose={closeModal}
        title={editing ? "Editar sede" : "Nueva sede"}
      >
        <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          {fieldErrors[""] && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {fieldErrors[""]}
            </div>
          )}
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            error={fieldErrors.name}
            required
            className="sm:col-span-2"
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            error={fieldErrors.address}
            required
            className="sm:col-span-2"
          />
          <Input
            label="Ciudad"
            value={form.city}
            onChange={(e) => update({ city: e.target.value })}
            error={fieldErrors.city}
            required
          />
          <Input
            label="Teléfono"
            value={form.phone ?? ""}
            onChange={(e) => update({ phone: e.target.value })}
            error={fieldErrors.phone}
            hint="Obligatorio. Ej.: +57 300 123 4567"
            inputMode="tel"
            required
          />
          <Input
            label="Correo (opcional)"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => update({ email: e.target.value })}
            error={fieldErrors.email}
            className="sm:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm text-app sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Sede activa
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="secondary" onClick={closeModal} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar sede"
        description={`¿Eliminar la sede "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
