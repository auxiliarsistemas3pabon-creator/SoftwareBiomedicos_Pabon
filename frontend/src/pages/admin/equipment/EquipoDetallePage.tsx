import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EquipoFichaContent } from "@/pages/admin/equipment/EquipoFicha";
import { equipmentService } from "@/services/equipment.service";
import { getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/permissions";
import type { Equipment } from "@/types/equipment/equipment";

export function EquipoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const numericId = Number(id);

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(numericId) || numericId <= 0) {
      setError("Identificador de equipo inválido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    equipmentService
      .retrieve(numericId)
      .then(setEquipment)
      .catch((err) =>
        setError(getApiErrorMessage(err, "No se pudo cargar el equipo")),
      )
      .finally(() => setLoading(false));
  }, [numericId]);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => navigate("/admin/equipos")}
          >
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-app">
              Hoja de vida del equipo
            </h1>
            <p className="text-sm text-app-muted">
              {usuario?.role === "tecnico"
                ? "Consulta el equipo asignado a tu área."
                : "Información, mantenimientos realizados y agendamientos."}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <Card>
          <p className="py-10 text-center text-sm text-app-muted">Cargando...</p>
        </Card>
      ) : error ? (
        <Card>
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <p>{error}</p>
            <p className="mt-2 text-xs">
              <Link
                to="/admin/equipos"
                className="underline hover:text-red-900 dark:hover:text-red-200"
              >
                Volver al listado de equipos
              </Link>
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <EquipoFichaContent
            equipment={equipment}
            canEdit={can(usuario?.role, "equipment", "edit")}
          />
        </Card>
      )}
    </div>
  );
}
