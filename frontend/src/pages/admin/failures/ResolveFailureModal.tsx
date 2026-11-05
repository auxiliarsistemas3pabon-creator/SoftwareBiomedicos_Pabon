import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ResolveFailureModalProps } from "@/types/failure/props";

export function ResolveFailureModal({
  resolveTarget,
  setResolveTarget,
  resolveNotes,
  setResolveNotes,
  submitResolve,
  resolving,
}: ResolveFailureModalProps) {
  return (
    <Modal
      open={!!resolveTarget}
      onClose={() => setResolveTarget(null)}
      title="Marcar falla como resuelta"
      size="md"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-app-muted">
          Documenta cómo se resolvió la falla. Las notas son opcionales pero
          recomendadas.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-app">
            Notas de resolución
          </label>
          <textarea
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 text-sm text-app outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResolveTarget(null)}>
            Cancelar
          </Button>
          <Button onClick={submitResolve} loading={resolving}>
            Marcar resuelta
          </Button>
        </div>
      </div>
    </Modal>
  );
}
