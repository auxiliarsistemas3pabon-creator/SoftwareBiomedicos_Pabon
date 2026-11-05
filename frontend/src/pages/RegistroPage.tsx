import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  IdCard,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface FormState {
  nombre: string;
  apellido: string;
  documento: string;
  cargo: string;
  correo: string;
  password: string;
  confirmPassword: string;
}

const initial: FormState = {
  nombre: "",
  apellido: "",
  documento: "",
  cargo: "",
  correo: "",
  password: "",
  confirmPassword: "",
};

export function RegistroPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!form.apellido.trim()) e.apellido = "El apellido es obligatorio";
    if (!form.documento.trim()) e.documento = "El documento es obligatorio";
    else if (!/^\d{6,15}$/.test(form.documento))
      e.documento = "El documento debe tener entre 6 y 15 dígitos";
    if (!form.cargo.trim()) e.cargo = "Selecciona un cargo";
    if (!form.correo.trim()) e.correo = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo))
      e.correo = "Correo no válido";
    if (form.password.length < 8)
      e.password = "Mínimo 8 caracteres";
    else if (!/[A-Z]/.test(form.password) || !/\d/.test(form.password))
      e.password = "Debe incluir al menos una mayúscula y un número";
    if (form.confirmPassword !== form.password)
      e.confirmPassword = "Las contraseñas no coinciden";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    // MOCK: cuando exista backend → api.post("/auth/registro", form)
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-muted p-6">
        <Card padding="lg" className="w-full max-w-md text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-app">
            Solicitud enviada
          </h1>
          <p className="mt-2 text-sm text-app-muted">
            Hemos recibido tu solicitud de registro. Un administrador la
            revisará y recibirás una notificación al correo{" "}
            <strong className="text-app">{form.correo}</strong> cuando tu cuenta
            esté activa.
          </p>
          <Button
            className="mt-6"
            fullWidth
            onClick={() => navigate("/")}
          >
            Ir a iniciar sesión
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-muted">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
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
              <BadgeCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-app">Solicitar registro</h1>
              <p className="mt-1 text-sm text-app-muted">
                Completa tus datos. Tu cuenta deberá ser aprobada por un
                administrador antes de poder ingresar al sistema.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              leftIcon={<User size={16} />}
              error={errors.nombre}
              required
            />
            <Input
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              leftIcon={<User size={16} />}
              error={errors.apellido}
              required
            />
            <Input
              label="Documento de identidad"
              name="documento"
              value={form.documento}
              onChange={handleChange}
              leftIcon={<IdCard size={16} />}
              error={errors.documento}
              hint="Solo números, sin puntos ni guiones"
              required
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cargo"
                className="text-sm font-medium text-app"
              >
                Cargo
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-app-muted">
                  <Briefcase size={16} />
                </span>
                <select
                  id="cargo"
                  name="cargo"
                  value={form.cargo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cargo: e.target.value }))
                  }
                  className={`w-full appearance-none rounded-lg border bg-surface py-2.5 pl-10 pr-3 text-sm text-app outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                    errors.cargo
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-app"
                  }`}
                >
                  <option value="">Selecciona un cargo</option>
                  <option value="tecnico">Usuario operativo</option>
                  <option value="enfermeria">Enfermería</option>
                  <option value="medico">Médico</option>
                  <option value="administrativo">Administrativo</option>
                </select>
              </div>
              {errors.cargo && (
                <p className="text-xs text-red-600">{errors.cargo}</p>
              )}
            </div>

            <Input
              label="Correo institucional"
              name="correo"
              type="email"
              value={form.correo}
              onChange={handleChange}
              leftIcon={<Mail size={16} />}
              error={errors.correo}
              className="sm:col-span-2"
              required
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              leftIcon={<Lock size={16} />}
              error={errors.password}
              hint="Mínimo 8 caracteres, una mayúscula y un número"
              required
            />
            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              leftIcon={<Lock size={16} />}
              error={errors.confirmPassword}
              required
            />

            <div className="sm:col-span-2">
              <Button type="submit" loading={loading} fullWidth size="lg">
                {loading ? "Enviando..." : "Enviar solicitud"}
              </Button>
              <p className="mt-3 text-center text-xs text-app-muted">
                ¿Ya tienes cuenta?{" "}
                <Link to="/" className="font-medium text-primary hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
