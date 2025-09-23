import type { Activo } from "../types";

type ActivosTableProps = {
  items: Activo[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (item: Activo) => void;
  onAssign: (item: Activo) => void;
  onDelete: (item: Activo) => void;
  onHistory: (item: Activo) => void;
};

export function ActivosTable({
  items,
  total,
  loading,
  hasMore,
  onLoadMore,
  onEdit,
  onAssign,
  onDelete,
  onHistory,
}: ActivosTableProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-0 backdrop-blur-md overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto -mx-4 sm:mx-0">
        <div className="block lg:hidden divide-y divide-white/10">
          {items.map((activo) => (
            <div key={activo._id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-neutral-300">
                    {activo.categoria || "-"}
                  </div>
                  <div className="font-semibold truncate">
                    {(activo.marca || "") + " " + (activo.modelo || "-")}
                  </div>
                  <ul className="mt-1 text-sm text-neutral-300 space-y-1">
                    <li>
                      <span className="text-neutral-400">Serie:</span>{" "}
                      {activo.numeroSerie || "-"}
                    </li>
                    <li>
                      <span className="text-neutral-400">Sucursal:</span>{" "}
                      {activo.sucursal || "-"}
                    </li>
                    <li>
                      <span className="text-neutral-400">Compra:</span>{" "}
                      {activo.fechaCompra
                        ? new Date(activo.fechaCompra).toLocaleDateString()
                        : "-"}
                    </li>
                    <li>
                      <span className="text-neutral-400">Factura:</span>{" "}
                      {activo.numeroFactura || "-"}
                    </li>
                    <li>
                      <span className="text-neutral-400">Detalles:</span>{" "}
                      {activo.detalles || "-"}
                    </li>
                    <li>
                      <span className="text-neutral-400">Asignado a:</span>{" "}
                      {activo.asignadoPara || "-"}
                    </li>
                    <li>
                      <span className="text-neutral-400">Asignacion:</span>{" "}
                      {activo.fechaAsignacion
                        ? new Date(activo.fechaAsignacion).toLocaleDateString()
                        : "-"}
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs sm:text-sm font-medium hover:bg-white/10 transition"
                  onClick={() => onEdit(activo)}
                >
                  Editar
                </button>
                <button
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs sm:text-sm font-medium hover:bg-white/10 transition"
                  onClick={() => onAssign(activo)}
                >
                  {activo.asignadoPara ? "Reasignar" : "Asignar"}
                </button>
                <button
                  className="rounded-lg border border-red-500/40 px-2 py-1 text-xs sm:text-sm font-medium hover:bg-red-500/20 transition"
                  onClick={() => onDelete(activo)}
                >
                  Eliminar
                </button>
                <button
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs sm:text-sm font-medium hover:bg-white/10 transition"
                  onClick={() => onHistory(activo)}
                >
                  Historial
                </button>
              </div>
            </div>
          ))}
          {total === 0 && !loading && (
            <div className="px-4 py-6 text-center text-neutral-300">
              Sin resultados
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <table className="min-w-full text-sm">
            <thead className="bg-black sticky top-0 z-10 backdrop-blur">
              <tr>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">Marca</th>
                <th className="text-left px-4 py-3">Modelo</th>
                <th className="text-left px-4 py-3">Serie</th>
                <th className="text-left px-4 py-3">Sucursal</th>
                <th className="text-left px-4 py-3">Compra</th>
                <th className="text-left px-4 py-3">Factura</th>
                <th className="text-left px-4 py-3">Detalles</th>
                <th className="text-left px-4 py-3">Asignado a</th>
                <th className="text-left px-4 py-3">Asignacion</th>
                <th className="text-left px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((activo) => (
                <tr
                  key={activo._id}
                  className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors"
                >
                  <td className="px-4 py-2">{activo.categoria || "-"}</td>
                  <td className="px-4 py-2">{activo.marca || "-"}</td>
                  <td
                    className="px-4 py-2 max-w-[200px] truncate"
                    title={activo.modelo || undefined}
                  >
                    {activo.modelo || "-"}
                  </td>
                  <td
                    className="px-4 py-2 max-w-[200px] truncate"
                    title={activo.numeroSerie || undefined}
                  >
                    {activo.numeroSerie || "-"}
                  </td>
                  <td
                    className="px-4 py-2 max-w-[200px] truncate"
                    title={activo.sucursal || undefined}
                  >
                    {activo.sucursal || "-"}
                  </td>
                  <td className="px-4 py-2">
                    {activo.fechaCompra
                      ? new Date(activo.fechaCompra).toLocaleDateString()
                      : "-"}
                  </td>
                  <td
                    className="px-4 py-2 max-w-[200px] truncate"
                    title={activo.numeroFactura || undefined}
                  >
                    {activo.numeroFactura || "-"}
                  </td>
                  <td
                    className="px-4 py-2 max-w-[260px] truncate"
                    title={activo.detalles || undefined}
                  >
                    {activo.detalles || "-"}
                  </td>
                  <td
                    className="px-4 py-2 max-w-[200px] truncate"
                    title={activo.asignadoPara || undefined}
                  >
                    {activo.asignadoPara || "-"}
                  </td>
                  <td className="px-4 py-2">
                    {activo.fechaAsignacion
                      ? new Date(activo.fechaAsignacion).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap items-center gap-1.5 gap-y-1">
                      <button
                        className="rounded-lg border border-white/10 px-2 py-1 text-xs sm:text-sm font-medium hover:bg-white/10 transition"
                        onClick={() => onEdit(activo)}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-lg border border-white/10 px-2 py-1 text-xs sm:text-sm font-medium hover:bg-white/10 transition"
                        onClick={() => onAssign(activo)}
                      >
                        {activo.asignadoPara ? "Reasignar" : "Asignar"}
                      </button>
                      <button
                        className="rounded-lg border border-red-500/40 px-2 py-1 text-xs sm:text-sm font-medium hover:bg-red-500/20 transition"
                        onClick={() => onDelete(activo)}
                      >
                        Eliminar
                      </button>
                      <button
                        className="rounded-lg border border-white/10 px-2 py-1 text-xs sm:text-sm font-medium hover:bg-white/10 transition"
                        onClick={() => onHistory(activo)}
                      >
                        Historial
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {total === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-neutral-300" colSpan={11}>
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="px-4 py-4 flex justify-center border-t border-white/10">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            onClick={onLoadMore}
          >
            Mostrar mas
          </button>
        </div>
      )}

      {loading && (
        <div className="px-4 py-3 text-neutral-300 border-t border-white/10">
          Cargando.
        </div>
      )}
    </div>
  );
}
