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
  const makeActionButtons = (activo: Activo) => {
    const assignLabel = activo.asignadoPara ? "Reasignar" : "Asignar";

    return [
      <button
        key="edit"
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
        onClick={() => onEdit(activo)}
        aria-label="Editar"
        title="Editar"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.862 4.487l1.688-1.688a1.5 1.5 0 1 1 2.122 2.122L7.5 18.094l-3 1 1-3 11.362-11.607Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 19.5h12" />
        </svg>
      </button>,
      <button
        key="assign"
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
        onClick={() => onAssign(activo)}
        aria-label={assignLabel}
        title={assignLabel}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8 7-5 5m0 0 5 5M3 12h12m6 5v2a2 2 0 0 1-2 2h-3m5-18v2a2 2 0 0 1-2 2h-3"
          />
        </svg>
      </button>,
      <button
        key="delete"
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition"
        onClick={() => onDelete(activo)}
        aria-label="Eliminar"
        title="Eliminar"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.5 9.5v7m5-7v7M4.5 6h15M7 6l.75-2h8.5L17 6m-1 0 .7 11.2a2 2 0 0 1-2 2.1H9.3a2 2 0 0 1-2-2.1L8 6"
          />
        </svg>
      </button>,
      <button
        key="history"
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
        onClick={() => onHistory(activo)}
        aria-label="Historial"
        title="Historial"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12a9 9 0 1 1 9 9M12 7.5V12l3 3"
          />
        </svg>
      </button>,
    ];
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-0 backdrop-blur-md overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto px-4 sm:px-0">
        <div className="block lg:hidden space-y-4">
          {items.map((activo) => (
            <div
              key={activo._id}
              className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4"
            >
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
              <div className="mt-3 grid grid-cols-4 gap-1">
                {makeActionButtons(activo)}
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
                    <div className="flex flex-wrap items-center gap-1">
                      {makeActionButtons(activo)}
                    </div>
                  </td>
                </tr>
              ))}
              {total === 0 && !loading && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-neutral-300"
                    colSpan={11}
                  >
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
            type="button"
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
