import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  IdCard,
  Key,
  LogOut,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconHint } from "@/components/ui/IconHint";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL } from "@/lib/permissions";
import { usersService } from "@/services/users.service";
import { getApiErrorMessage } from "@/lib/api";
import { fullNameOf } from "@/lib/users";

export function PerfilPage() {
  const { usuario, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorPwd, setErrorPwd] = useState<string | null>(null);

  if (!usuario) return null;

  const fullName = fullNameOf(usuario);

  const initials = (
    (usuario.first_name?.[0] ?? usuario.username[0] ?? "?") +
    (usuario.last_name?.[0] ?? "")
  ).toUpperCase();

  const submitPwd = async () => {
    setErrorPwd(null);
    if (newPwd.length < 8) {
      setErrorPwd("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setErrorPwd("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    try {
      await usersService.setPassword(usuario.id, {
        current_password: currentPwd,
        new_password: newPwd,
      });
      setPwdOpen(false);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setFeedback("Contraseña actualizada correctamente.");
      void refreshUser();
    } catch (err) {
      setErrorPwd(getApiErrorMessage(err, "No se pudo cambiar la contraseña"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-app">Mi perfil</h1>
        <p className="text-sm text-app-muted">
          Información personal y configuración de la cuenta.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {feedback}
        </div>
      )}

      <Card padding="lg">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
            {initials}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="text-base font-semibold text-app">{fullName}</h2>
            <p className="text-sm text-app-muted">@{usuario.username}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone="primary">
                <ShieldCheck size={12} className="mr-1" />
                {ROLE_LABEL[usuario.role]}
              </Badge>
              <Badge tone={usuario.is_active ? "success" : "neutral"}>
                {usuario.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
          <IconHint label="Cambiar contraseña">
            <Button
              variant="secondary"
              className="h-8! w-8! px-0!"
              aria-label="Cambiar contraseña"
              onClick={() => setPwdOpen(true)}
            >
              <Key size={14} />
            </Button>
          </IconHint>
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="mb-4 text-base font-semibold text-app">
          Datos de la cuenta
        </h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field icon={<UserIcon size={14} />} label="Nombre completo">
            {fullName}
          </Field>
          <Field icon={<IdCard size={14} />} label="Usuario">
            {usuario.username}
          </Field>
          <Field icon={<Mail size={14} />} label="Correo electrónico">
            {usuario.email}
          </Field>
          <Field icon={<Phone size={14} />} label="Teléfono">
            {usuario.phone || "—"}
          </Field>
          <Field icon={<ShieldCheck size={14} />} label="Rol">
            {ROLE_LABEL[usuario.role]}
          </Field>
          <Field icon={<Building2 size={14} />} label="Sede asignada">
            {usuario.branch_name ?? (
              <span className="text-app-muted">
                Sin sede asignada · contacta a un administrador
              </span>
            )}
          </Field>
        </dl>
      </Card>

      <Card padding="lg">
        <h3 className="mb-4 text-base font-semibold text-app">
          Configuración
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <Moon size={14} className="mt-0.5 text-app-muted" />
              <div>
                <p className="text-sm font-medium text-app">Apariencia</p>
                <p className="text-xs text-app-muted">
                  Cambia entre modo claro y modo oscuro.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <div className="border-t border-app pt-4">
            <Button
              variant="secondary"
              leftIcon={<LogOut size={14} />}
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={pwdOpen}
        onClose={() => setPwdOpen(false)}
        title="Cambiar contraseña"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {errorPwd && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {errorPwd}
            </div>
          )}
          <Input
            label="Contraseña actual"
            type="password"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            hint="Mínimo 8 caracteres."
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPwdOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitPwd} loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-app-muted">
        <span className="text-app-muted">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-sm text-app">{children}</dd>
    </div>
  );
}
