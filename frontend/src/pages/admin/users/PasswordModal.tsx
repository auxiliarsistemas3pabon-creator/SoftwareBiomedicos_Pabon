import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { PasswordModalProps } from "@/types/authentication/props";

export function PasswordModal({
  pwdTarget,
  setPwdTarget,
  newPassword,
  setNewPassword,
  submitPassword,
  pwdSaving,
}: PasswordModalProps) {
  return (
    <Modal
      open={!!pwdTarget}
      onClose={() => setPwdTarget(null)}
      title={`Cambiar contraseña — ${pwdTarget?.username ?? ""}`}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-app-muted">
          Como administrador puedes definir una nueva contraseña sin necesidad
          de la actual. El usuario podrá cambiarla luego desde su perfil.
        </p>
        <Input
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          hint="Mínimo 8 caracteres."
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPwdTarget(null)}>
            Cancelar
          </Button>
          <Button onClick={submitPassword} loading={pwdSaving}>
            Cambiar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
