import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Boxes,
  GraduationCap,
  HeartPulse,
  History,
  LineChart,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PUBLIC_REGISTRATION_ENABLED } from "@/lib/featureFlags";

const problemas = [
  {
    icon: Boxes,
    title: "Inventario disperso",
    desc: "La información de los equipos está repartida en hojas de cálculo, carpetas físicas y memorias del personal técnico.",
  },
  {
    icon: History,
    title: "Trazabilidad limitada",
    desc: "Es difícil saber cuándo se hizo el último mantenimiento, quién lo realizó y qué intervenciones se han hecho a un equipo.",
  },
  {
    icon: ShieldCheck,
    title: "Riesgo regulatorio",
    desc: "Sin un control digital es complejo evidenciar el cumplimiento de las normas de mantenimiento de equipos biomédicos.",
  },
];

const numeros = [
  { value: "100%", label: "Equipos digitalizados" },
  { value: "24/7", label: "Disponibilidad de la plataforma" },
  { value: "3", label: "Roles diferenciados" },
  { value: "0", label: "Pérdida de información" },
];

const modulos = [
  {
    icon: Stethoscope,
    title: "Hojas de vida",
    desc: "Ficha completa de cada equipo: marca, modelo, serie, ubicación, responsable y documentación asociada.",
  },
  {
    icon: Wrench,
    title: "Mantenimientos",
    desc: "Programación de preventivos, registro de correctivos y cronograma anual visible para todo el equipo técnico.",
  },
  {
    icon: LineChart,
    title: "Reportes",
    desc: "Indicadores de cumplimiento, tiempos de intervención y exportación de información para auditorías.",
  },
  {
    icon: ShieldCheck,
    title: "Roles y permisos",
    desc: "Administrador, técnico y usuario clínico, cada uno con accesos diseñados a su responsabilidad.",
  },
];

export function HomePage() {
  return (
    <div>
      {/* HERO institucional minimalista — sin gradiente rojo dominante */}
      <section className="border-b border-app bg-app-muted">
        <div className="mx-auto grid max-w-screen-2xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr] md:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-app bg-surface px-3 py-1 text-xs font-medium text-app-muted">
              <GraduationCap size={14} className="text-primary" />
              Trabajo de grado · Ingeniería de Software · Universidad Cooperativa de Colombia
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-app sm:text-4xl md:text-5xl">
              Un solo lugar para gestionar todos los{" "}
              <span className="text-primary">equipos biomédicos</span>{" "}
              de la clínica.
            </h1>
            <p className="mt-4 max-w-xl text-app-muted">
              Sistema web desarrollado para Clínica Pabón que centraliza el
              inventario, los mantenimientos y la trazabilidad de los equipos
              biomédicos, reemplazando el manejo manual y disperso de la
              información.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" rightIcon={<ArrowRight size={16} />}>
                  Acceder al sistema
                </Button>
              </Link>
              <a href="#sobre-el-proyecto">
                <Button size="lg" variant="secondary" leftIcon={<BookOpen size={16} />}>
                  Sobre el proyecto
                </Button>
              </a>
            </div>
          </div>

          {/* Tarjeta lateral con info clínica, no el paboncito que ya sale en el login */}
          <Card padding="lg" className="bg-surface">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HeartPulse size={22} />
              </div>
              <div>
                <p className="text-sm text-app-muted">Institución</p>
                <p className="text-lg font-semibold text-app">Clínica Pabón</p>
              </div>
            </div>
            <hr className="my-5 border-app" />
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-app">
                <Activity size={16} className="mt-0.5 text-primary" />
                <span>Departamento de Ingeniería Clínica.</span>
              </li>
              <li className="flex items-start gap-2 text-app">
                <Boxes size={16} className="mt-0.5 text-primary" />
                <span>Inventario unificado por sede y servicio.</span>
              </li>
              <li className="flex items-start gap-2 text-app">
                <ShieldCheck size={16} className="mt-0.5 text-primary" />
                <span>Cumplimiento de la normativa vigente.</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Problema que resuelve */}
      <section className="mx-auto max-w-screen-2xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Contexto
          </p>
          <h2 className="mt-1 text-2xl font-bold text-app sm:text-3xl">
            ¿Qué problema resuelve?
          </h2>
          <p className="mt-2 text-app-muted">
            Hoy la gestión de los equipos biomédicos en la institución se hace
            de forma manual, lo que genera tres dificultades recurrentes:
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {problemas.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-l-4 border-l-primary">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-app">{title}</h3>
              <p className="mt-1 text-sm text-app-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Banda de números — institucional */}
      <section className="border-y border-app bg-app-muted">
        <div className="mx-auto grid max-w-screen-2xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
          {numeros.map((n) => (
            <div key={n.label} className="text-center">
              <p className="text-3xl font-bold text-primary sm:text-4xl">
                {n.value}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-app-muted">
                {n.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Módulos */}
      <section
        id="sobre-el-proyecto"
        className="mx-auto max-w-screen-2xl px-4 py-16 sm:px-6"
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Módulos del sistema
          </p>
          <h2 className="mt-1 text-2xl font-bold text-app sm:text-3xl">
            Una plataforma, cuatro grandes áreas
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {modulos.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="flex gap-4">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app">{title}</h3>
                <p className="mt-1 text-sm text-app-muted">{desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-screen-2xl px-4 py-14 sm:px-6">
        <Card padding="lg" className="text-center">
          <h2 className="text-2xl font-bold text-app sm:text-3xl">
            ¿Listo para empezar?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-app-muted">
            Ingresa con tu cuenta institucional. Si aún no tienes acceso,
            solicita el registro al administrador del sistema.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/login">
              <Button size="lg">Iniciar sesión</Button>
            </Link>
            {PUBLIC_REGISTRATION_ENABLED && (
              <Link to="/registro">
                <Button size="lg" variant="secondary">
                  Solicitar registro
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
