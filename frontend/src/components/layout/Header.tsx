import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Menu, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ROLE_LABEL, panelHome } from "@/lib/permissions";
import { fullNameOf } from "@/lib/users";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { usuario, isAuthenticated } = useAuth();
  const location = useLocation();

  const fullName = usuario ? fullNameOf(usuario) : "";

  // El botón "Ir al panel" sólo aparece cuando el usuario está autenticado
  // y NO está ya dentro del panel.
  const showGoToPanel =
    isAuthenticated && !location.pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-30 border-b border-app bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-app hover:bg-app-muted lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2">
            <div className="rounded-md bg-white p-1 shadow-sm">
              <img
                src="/icons/logo-clinica.png"
                alt="Clínica Pabón"
                className="h-9 w-auto"
              />
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold text-app">
                Clínica Pabón
              </span>
              <span className="text-xs text-app-muted">
                Equipos Biomédicos
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isAuthenticated && <ThemeToggle />}
          {isAuthenticated && usuario ? (
            <>
              <div className="hidden items-center gap-2 rounded-lg border border-app bg-app-muted px-3 py-2 sm:flex">
                <User size={16} className="text-app-muted" />
                <span className="text-sm font-medium text-app">{fullName}</span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {ROLE_LABEL[usuario.role]}
                </span>
              </div>
              {showGoToPanel && (
                <Link
                  to={panelHome(usuario.role)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  <LayoutDashboard size={16} />
                  <span className="hidden sm:inline">Ir al panel</span>
                </Link>
              )}
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}