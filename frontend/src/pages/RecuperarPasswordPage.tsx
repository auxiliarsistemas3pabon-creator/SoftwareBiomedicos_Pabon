import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// El auto-servicio de recuperación por correo todavía no existe en el backend
// (no hay endpoint ni envío de correo). El restablecimiento lo hace un
// administrador desde Admin → Usuarios → "Contraseña". Esta pantalla explica
// ese procedimiento con honestidad en vez de simular un envío de enlace.
export function RecuperarPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-muted p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-app-muted hover:text-primary"
          >
            <ArrowLeft size={16} />
            Volver a iniciar sesión
          </Link>
          <ThemeToggle />
        </div>

        <Card padding="lg">
          <div className="mb-6 flex items-start gap-3">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-app">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="mt-1 text-sm text-app-muted">
                El restablecimiento de contraseñas lo gestiona un administrador
                del sistema.
              </p>
            </div>
          </div>

          <ol className="flex flex-col gap-3 text-sm text-app">
            <li className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-muted text-xs font-bold text-app-muted">
                1
              </span>
              <span>
                Contacta a un administrador (super administrador o
                administrador) de la clínica.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-muted text-xs font-bold text-app-muted">
                2
              </span>
              <span>
                El administrador entra a <strong>Admin → Usuarios</strong>,
                busca tu cuenta y usa el botón{" "}
                <strong>“Contraseña”</strong> para asignarte una nueva.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-muted text-xs font-bold text-app-muted">
                3
              </span>
              <span>
                Inicia sesión con esa contraseña y cámbiala desde{" "}
                <strong>Mi perfil → Cambiar contraseña</strong>.
              </span>
            </li>
          </ol>

          <div className="mt-6 flex items-start gap-2 rounded-lg border border-app bg-app-muted p-3 text-xs text-app-muted">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            <span>
              Por seguridad, el sistema no envía enlaces de recuperación por
              correo. Solo un administrador puede restablecer una contraseña.
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <a
              href="mailto:softwarecccnp@gmail.com?subject=Restablecer%20contrase%C3%B1a%20-%20Equipos%20Biom%C3%A9dicos"
              className="w-full"
            >
              <Button fullWidth leftIcon={<Mail size={16} />}>
                Escribir a soporte
              </Button>
            </a>
            <Link to="/" className="w-full">
              <Button fullWidth variant="secondary">
                Volver a iniciar sesión
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
