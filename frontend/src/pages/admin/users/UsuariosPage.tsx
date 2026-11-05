import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { usersService } from "@/services/users.service";
import { ROLE_LABEL, ASSIGNABLE_ROLES, can, canAssignRole } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { fullNameOf } from "@/lib/users";
import type { Rol, Usuario } from "@/types/authentication/auth";
import type { CreateUserInput } from "@/types/authentication/user";
import type { FormState } from "@/types/authentication/form";
import { PAGE_SIZE, empty } from "@/utils/user.utils";
import { UserHeader } from "@/pages/admin/users/UserHeader";
import { UserFilters } from "@/pages/admin/users/UserFilters";
import { UserTable } from "@/pages/admin/users/UserTable";
import { UserPagination } from "@/pages/admin/users/UserPagination";
import { UserFormModal } from "@/pages/admin/users/UserFormModal";
import { PasswordModal } from "@/pages/admin/users/PasswordModal";

export function UsuariosPage() {
  const { usuario } = useAuth();
  const role = usuario?.role;

  const [items, setItems] = useState<Usuario[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState("");
  const [userOptions, setUserOptions] = useState<
    { value: string; label: string; hint?: string }[]
  >([]);

  const [editing, setEditing] = useState<Usuario | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [pwdTarget, setPwdTarget] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toToggle, setToToggle] = useState<Usuario | null>(null);

  const applyToggle = async (u: Usuario) => {
    setTogglingId(u.id);
    // Optimistic update — revertimos si falla.
    const next = !u.is_active;
    setItems((prev) =>
      prev.map((it) => (it.id === u.id ? { ...it, is_active: next } : it)),
    );
    try {
      const updated = await usersService.update(u.id, { is_active: next });
      setItems((prev) => prev.map((it) => (it.id === u.id ? updated : it)));
    } catch (err) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === u.id ? { ...it, is_active: u.is_active } : it,
        ),
      );
      alert(getApiErrorMessage(err, "No se pudo cambiar el estado"));
    } finally {
      setTogglingId(null);
      setToToggle(null);
    }
  };

  const requestToggle = (u: Usuario) => {
    if (u.is_active) {
      // Desactivar: pedir confirmación.
      setToToggle(u);
    } else {
      void applyToggle(u);
    }
  };

  const canCreate = can(role, "users", "create");
  const canEdit = can(role, "users", "edit");
  const canDelete = can(role, "users", "delete");

  const assignableRoles = useMemo<Rol[]>(
    () => ASSIGNABLE_ROLES.filter((r) => canAssignRole(role, r)),
    [role],
  );

  const roleOptions = useMemo(
    () => assignableRoles.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
    [assignableRoles],
  );

  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.listPaginated({
        ordering: "username",
        search: search || undefined,
        role: roleFilter || undefined,
        is_active:
          activeFilter === "true"
            ? true
            : activeFilter === "false"
              ? false
              : undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      });
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron cargar los usuarios"));
    } finally {
      setLoading(false);
    }
  };

  // Volver a la página 1 cuando cambian los filtros.
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, activeFilter]);

  const loadUserOptions = async () => {
    try {
      const all = await usersService.listAll({ ordering: "username" });
      const seen = new Set<string>();
      const options: { value: string; label: string; hint?: string }[] = [];
      for (const u of all) {
        const label = fullNameOf(u).trim() || u.username;
        const key = label.toLocaleLowerCase("es");
        if (seen.has(key)) continue;
        seen.add(key);
        options.push({ value: key, label, hint: u.username });
      }
      options.sort((a, b) => a.label.localeCompare(b.label, "es"));
      setUserOptions(options);
    } catch {
      setUserOptions([]);
    }
  };

  useEffect(() => {
    void loadUserOptions();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(page);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, activeFilter, page]);

  const openCreate = () => {
    setForm({
      ...empty,
      role: assignableRoles[0] ?? "tecnico",
    });
    setCreating(true);
  };

  const openEdit = (u: Usuario) => {
    setForm({
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      phone: u.phone ?? "",
      area: u.area ?? "",
      password: "",
      is_active: u.is_active,
    });
    setEditing(u);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(empty);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canAssignRole(role, form.role)) {
      alert("No tienes permiso para asignar ese rol.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await usersService.update(editing.id, {
          username: form.username,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          phone: form.phone || undefined,
          area: form.role === "tecnico" ? form.area.trim() : "",
          is_active: form.is_active,
        });
      } else {
        const payload: CreateUserInput = {
          username: form.username,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          phone: form.phone || undefined,
          area: form.role === "tecnico" ? form.area.trim() : "",
          password: form.password,
        };
        await usersService.create(payload);
      }
      closeModal();
      await load();
      void loadUserOptions();
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
      await usersService.remove(toDelete.id);
      setToDelete(null);
      await load();
      void loadUserOptions();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setDeleting(false);
    }
  };

  const submitPassword = async () => {
    if (!pwdTarget) return;
    if (newPassword.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setPwdSaving(true);
    try {
      await usersService.setPassword(pwdTarget.id, { new_password: newPassword });
      setPwdTarget(null);
      setNewPassword("");
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo cambiar la contraseña"));
    } finally {
      setPwdSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <UserHeader />

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
        <UserFilters
          setSearch={setSearch}
          userOptions={userOptions}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
        <UserTable
          items={items}
          loading={loading}
          canEdit={canEdit}
          canDelete={canDelete}
          role={role}
          usuario={usuario}
          togglingId={togglingId}
          requestToggle={requestToggle}
          setPwdTarget={setPwdTarget}
          setNewPassword={setNewPassword}
          openEdit={openEdit}
          setToDelete={setToDelete}
          canCreate={canCreate}
          assignableRoles={assignableRoles}
          openCreate={openCreate}
        />
        </div>

        <UserPagination
          count={count}
          start={start}
          end={end}
          page={page}
          totalPages={totalPages}
          loading={loading}
          setPage={setPage}
        />
      </Card>

      <UserFormModal
        creating={creating}
        editing={editing}
        closeModal={closeModal}
        submit={submit}
        form={form}
        setForm={setForm}
        roleOptions={roleOptions}
        role={role}
        saving={saving}
      />

      <ConfirmDialog
        open={!!toToggle}
        title="Desactivar usuario"
        description={`¿Desactivar a "${toToggle?.username}"? No podrá iniciar sesión hasta que vuelvas a activarlo.`}
        confirmText="Desactivar"
        danger
        loading={togglingId === toToggle?.id}
        onConfirm={() => toToggle && void applyToggle(toToggle)}
        onClose={() => setToToggle(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar usuario"
        description={`¿Eliminar a "${toDelete?.username}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <PasswordModal
        pwdTarget={pwdTarget}
        setPwdTarget={setPwdTarget}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        submitPassword={submitPassword}
        pwdSaving={pwdSaving}
      />
    </div>
  );
}
