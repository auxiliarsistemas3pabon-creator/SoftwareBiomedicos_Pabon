import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MaintenancePaginationProps } from "@/types/maintenance/props";

export function MaintenancePagination({
  count,
  start,
  end,
  page,
  totalPages,
  loading,
  load,
}: MaintenancePaginationProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-app pt-3 text-xs text-app-muted">
      <p>
        {count === 0
          ? "Sin resultados"
          : `Mostrando ${start}–${end} de ${count}`}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<ChevronLeft size={14} />}
          disabled={page <= 1 || loading}
          onClick={() => void load(Math.max(1, page - 1))}
        >
          Anterior
        </Button>
        <span className="px-2 text-app">
          {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          rightIcon={<ChevronRight size={14} />}
          disabled={page >= totalPages || loading}
          onClick={() => void load(Math.min(totalPages, page + 1))}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
