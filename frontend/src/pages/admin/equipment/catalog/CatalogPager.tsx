import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CatalogPager({
  count,
  page,
  pageSize,
  loading,
  onPrev,
  onNext,
}: {
  count: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app px-4 py-3 text-xs text-app-muted">
      <p>
        {count === 0 ? "Sin resultados" : `Mostrando ${start}–${end} de ${count}`}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<ChevronLeft size={14} />}
          disabled={page <= 1 || loading}
          onClick={onPrev}
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
          onClick={onNext}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
