import { Activity, Image as ImageIcon, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FichaInfoTabProps } from "@/types/equipment/ficha";
import { formatHours } from "@/utils/ficha.utils";

export function FichaInfoTab({
  canVerHistorial,
  canVerProgramados,
  history,
  scheduled,
  imageSrc,
  canEdit,
  eq,
  imageInputRef,
  uploadImage,
  uploadingImage,
  imageError,
}: FichaInfoTabProps) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      {(canVerHistorial || canVerProgramados) && (
        <p className="text-app-muted">
          Este equipo tiene actualmente
          {canVerHistorial && (
            <>
              {" "}
              <strong className="text-app">{history.length}</strong>{" "}
              mantenimientos registrados
            </>
          )}
          {canVerHistorial && canVerProgramados && " y"}
          {canVerProgramados && (
            <>
              {" "}
              <strong className="text-app">
                {scheduled.filter((s) => !s.is_completed).length}
              </strong>{" "}
              solicitudes pendientes
            </>
          )}
          .
        </p>
      )}

      {(imageSrc || canEdit) && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted">
            Imagen del equipo
          </h4>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {imageSrc && (
              <div className="overflow-hidden rounded-lg border border-app bg-app-muted">
                <img
                  src={imageSrc}
                  alt={`Imagen del equipo ${eq.name}`}
                  className="h-40 w-56 object-cover"
                />
              </div>
            )}
            {canEdit && (
              <div className="flex flex-col gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<ImageIcon size={14} />}
                  loading={uploadingImage}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {imageSrc ? "Cambiar imagen" : "Adjuntar imagen"}
                </Button>
                <p className="text-xs text-app-muted">
                  JPG o PNG, máximo 8 MB.
                </p>
                {imageError && (
                  <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {imageError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted">
          Confiabilidad del servicio
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border border-app bg-app-muted p-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity size={16} />
            </span>
            <div className="flex-1">
              <p className="text-xs text-app-muted">
                MTBF — Tiempo medio entre fallas
              </p>
              <p className="text-2xl font-bold text-app">
                {formatHours(eq.mtbf_hours)}
              </p>
              <p className="mt-0.5 text-xs text-app-muted">
                Mayor es mejor: indica que el equipo presenta pocas fallas
                en el tiempo.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-app bg-app-muted p-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Timer size={16} />
            </span>
            <div className="flex-1">
              <p className="text-xs text-app-muted">
                MTTR — Tiempo medio de reparación
              </p>
              <p className="text-2xl font-bold text-app">
                {formatHours(eq.mttr_hours)}
              </p>
              <p className="mt-0.5 text-xs text-app-muted">
                Menor es mejor: indica reparaciones eficientes y menor
                tiempo de inactividad.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-app-muted">
          Valores calculados automáticamente a partir del historial de
          fallas reportadas. No editables.
        </p>
      </div>
    </div>
  );
}
