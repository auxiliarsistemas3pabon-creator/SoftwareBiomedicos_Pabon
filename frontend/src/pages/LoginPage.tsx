import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { panelHome } from "@/lib/permissions";
import { PUBLIC_REGISTRATION_ENABLED } from "@/lib/featureFlags";

const features = [
  {
    title: "Hojas de vida",
    desc: "Registro completo y actualizado de cada equipo biomédico.",
  },
  {
    title: "Mantenimientos preventivos y correctivos",
    desc: "Programa, ejecuta y documenta intervenciones técnicas.",
  },
  {
    title: "Reportes y trazabilidad",
    desc: "Consulta el estado e historial de cada equipo en tiempo real.",
  },
  {
    title: "Usuarios y roles",
    desc: "Control de acceso por rol dentro de la clínica.",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // La URL pretendida (ej. la hoja de vida al escanear un QR sin sesión)
  // llega por `state.from` (ProtectedRoute) o por `?next=` (el interceptor
  // de api.ts cuando expira la sesión). Sólo respetamos rutas internas.
  const fromState = (location.state as { from?: string } | null)?.from;
  const fromQuery = new URLSearchParams(location.search).get("next");
  const target = fromState ?? fromQuery ?? "";
  const explicitRedirect =
    typeof target === "string" && target.startsWith("/") && !target.startsWith("//")
      ? target
      : null;

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(formData);
      navigate(explicitRedirect ?? panelHome(u.role), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh w-full grid-cols-2">
      <aside className="relative flex min-h-dvh min-w-0 flex-col bg-gradient-to-br from-primary via-primary-dark to-primary-darker px-6 py-5 text-white">
        <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-2 py-1.5 shadow-md">
          <img
            src="/icons/logo-clinica.png"
            alt="Clínica Pabón"
            className="h-8 w-auto"
          />
          <span className="h-6 w-px shrink-0 bg-gray-200" aria-hidden />
          <img
            src="/icons/logo-centro-pabon.png"
            alt="Centro de Cuidados Cardioneurovasculares Pabón S.A.S."
            className="h-8 w-auto"
          />
        </div>

        <div className="relative z-10 mt-4 max-w-46">
          <h1 className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/80">
            Gestión de equipos biomédicos
          </h1>
          <p className="mt-1 text-xl font-bold italic leading-snug tracking-tight">
            Trabajamos con el corazón
          </p>
          <ul className="mt-3 space-y-1.5">
            {features.map((f) => (
              <li key={f.title} className="flex gap-1.5">
                <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[8px] font-medium">
                  ✓
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug">{f.title}</p>
                  <p className="text-[11px] leading-snug text-white/75">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <img
          src="/images/paboncitobiomedico.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 z-0 h-52 w-auto max-w-[46%] object-contain object-bottom drop-shadow-2xl"
        />
      </aside>

      <section className="flex min-h-dvh min-w-0 items-center justify-center bg-app px-8 py-6">
        <div className="w-full max-w-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-app">Bienvenido</h2>
            <p className="mt-0.5 text-xs text-app-muted">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-red-300 bg-red-50 px-2.5 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <Input
              label="Usuario"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="usuario"
              value={formData.username}
              onChange={handleChange}
              leftIcon={<UserIcon size={14} />}
              className="py-1.5! text-xs!"
              required
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              leftIcon={<Lock size={14} />}
              className="py-1.5! text-xs!"
              required
            />

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="sm"
              className="mt-1 h-8! text-xs!"
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </form>

          <div className="mt-3 flex flex-col items-start gap-1 text-xs">
            <Link to="/recuperar-password" className="text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
            {PUBLIC_REGISTRATION_ENABLED ? (
              <Link to="/registro" className="text-primary hover:underline">
                ¿No tienes cuenta? Solicitar registro
              </Link>
            ) : (
              <p className="text-app-muted">
                ¿No tienes cuenta? El registro de nuevos usuarios lo realiza un
                administrador.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
