import type { DeleteContext } from "../types";

type DeleteModalProps = {
  open: boolean;
  context: DeleteContext | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function DeleteModal({
  open,
  context,
  loading,
  onClose,
  onSubmit,
}: DeleteModalProps) {
  if (!open || !context) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Confirmar eliminacion</h3>
          <p className="text-sm text-neutral-300 mt-1">
            Eliminar {context.titulo}? Esta accion no se puede deshacer.
          </p>
        </div>
        {loading && (
          <div className="mb-3 rounded-xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
            Procesando eliminacion...
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 transition hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[0_8px_22px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 font-semibold transition hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-[0_10px_24px_rgba(239,68,68,0.45)] active:translate-y-0 active:scale-[0.96] disabled:opacity-60"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
