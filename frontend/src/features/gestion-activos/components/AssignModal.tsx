import type { AssignContext } from "../types";

type AssignModalProps = {
  open: boolean;
  context: AssignContext | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (changes: Partial<AssignContext>) => void;
};

export function AssignModal({
  open,
  context,
  loading,
  onClose,
  onSubmit,
  onChange,
}: AssignModalProps) {
  if (!open || !context) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {context.asignadoPara ? "Reasignar" : "Asignar"} {context.titulo}
          </h3>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-300">Asignado a</label>
            <input
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={context.asignadoPara}
              onChange={(event) =>
                onChange({ asignadoPara: event.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300">Asignado el</label>
            <input
              type="date"
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={context.fechaAsignacion}
              onChange={(event) =>
                onChange({ fechaAsignacion: event.target.value })
              }
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-orange-600 px-5 py-2 font-semibold transition hover:bg-orange-500 disabled:opacity-60"
            onClick={onSubmit}
            disabled={loading}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
