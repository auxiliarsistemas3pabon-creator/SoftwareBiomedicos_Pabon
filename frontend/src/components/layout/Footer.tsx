import { Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-app bg-surface">
      <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-white p-1 shadow-sm">
              <img
                src="/icons/logo-clinica.png"
                alt="Clínica Pabón"
                className="h-10 w-auto"
              />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-app">Clínica Pabón</p>
              <p className="text-xs text-app-muted">
                Sistema de Gestión de Equipos Biomédicos
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-app-muted">
            Plataforma interna para el inventario, mantenimiento y trazabilidad
            de los equipos biomédicos de la institución.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-app">
            Contacto
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-app-muted">
            <li className="flex items-center gap-2">
              <Phone size={14} />
              <span>+57 3188869612</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={14} />
              <span>softwarecccnp@gmail.com</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={14} />
              <span>Pasto, Colombia</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-app">
            Soporte
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-app-muted">
            <li>
              <a
                href="mailto:softwarecccnp@gmail.com?subject=Soporte%20-%20Equipos%20Biom%C3%A9dicos"
                className="hover:text-primary"
              >
                Escribir a soporte técnico
              </a>
            </li>
            <li>
              <a
                href="tel:+573188869612"
                className="hover:text-primary"
              >
                Llamar a soporte
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-app">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-app-muted sm:flex-row sm:px-6">
          <p>© {year} Clínica Pabón — Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
