import type { HistMovimiento } from "../types";

type HistorialModalProps = {
  open: boolean;
  title: string;
  movimientos: HistMovimiento[];
  onClose: () => void;
};

export function HistorialModal({ open, title, movimientos, onClose }: HistorialModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Historial: {title}</h3>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        {movimientos.length === 0 ? (
          <div className="text-neutral-300">Sin movimientos.</div>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-auto">
            {[...movimientos]
              .reverse()
              .map((movimiento, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-white/10 p-3 bg-white/5"
                >
                  <div className="text-sm">
                    <span className="font-medium">{movimiento.accion}</span> para {" "}
                    <span className="font-medium">{movimiento.usuario || "-"}</span>
                  </div>
                  <div className="text-xs text-neutral-300">
                    {movimiento.fecha
                      ? new Date(movimiento.fecha).toLocaleString()
                      : "sin fecha"}
                    {(movimiento.desde || movimiento.hasta) && (
                      <>
                        {" "}- {movimiento.desde || ""}{" -> "}{movimiento.hasta || ""}
                      </>
                    )}
                  </div>
                  {movimiento.observacion && (
                    <div className="text-xs text-neutral-400 mt-1">
                      {movimiento.observacion}
                    </div>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
