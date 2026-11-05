import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { Rol } from "@/types/authentication/auth";
import type { UserFormModalProps } from "@/types/authentication/props";

export function UserFormModal({
  creating,
  editing,
  closeModal,
  submit,
  form,
  setForm,
  roleOptions,
  role,
  saving,
}: UserFormModalProps) {
  return (
    <Modal
      open={creating || !!editing}
      onClose={closeModal}
      title={editing ? "Editar usuario" : "Nuevo usuario"}
      size="lg"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Usuario (username)"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
        <Input
          label="Correo"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          label="Nombre"
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          required
        />
        <Input
          label="Apellido"
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          required
        />
        <Select
          label="Rol"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Rol })}
          options={roleOptions}
          required
          hint={
            role === "admin"
              ? "Como admin no puedes asignar rol superadmin/admin."
              : undefined
          }
        />
        <Input
          label="Teléfono"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {form.role === "tecnico" && (
          <Input
            label="Área"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            required
            hint="Ej. Radiología. El usuario operativo solo ve equipos de esta área y los reportes que él genera."
          />
        )}
        {!editing && (
          <Input
            label="Contraseña inicial"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            hint="Mínimo 8 caracteres. El superadmin/admin la define."
            className="sm:col-span-2"
          />
        )}
        {editing && (
          <label className="flex items-center gap-2 text-sm text-app sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            Usuario activo
          </label>
        )}
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
  );
}
