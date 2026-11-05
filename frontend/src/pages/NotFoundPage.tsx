import { Link } from "react-router-dom";
import { Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold text-app sm:text-4xl">
        Página no encontrada
      </h1>
      <p className="mt-2 max-w-md text-app-muted">
        La página que buscas no existe o fue movida a otra ubicación. Puedes
        volver al inicio o regresar al panel.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/">
          <Button variant="secondary" leftIcon={<Home size={16} />}>
            Ir al inicio
          </Button>
        </Link>
        {isAuthenticated && (
          <Link to="/admin">
            <Button leftIcon={<LayoutDashboard size={16} />}>
              Ir al panel
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
