import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Rol } from "@/types/authentication/auth";
import { panelHome } from "@/lib/permissions";

interface ProtectedRouteProps {
  roles?: Rol[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { usuario, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preservamos la URL pretendida (ej. /admin/equipos/42 al escanear un QR)
    // para que LoginPage redirija de vuelta tras autenticarse.
    return (
      <Navigate
        to="/"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
  if (roles && usuario && !roles.includes(usuario.role)) {
    return <Navigate to={panelHome(usuario?.role)} replace />;
  }

  return <Outlet />;
}
