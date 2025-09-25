import type { ReactElement } from "react";
import type { Licencia } from "../types";

type LicenciasTableProps = {
  items: Licencia[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (licencia: Licencia) => void;
  onAssign: (licencia: Licencia) => void;
  onDelete: (licencia: Licencia) => void;
  onHistory: (licencia: Licencia) => void;
};

export function LicenciasTable({
  items,
  total,
  loading,
  hasMore,
  onLoadMore,
  onEdit,
  onAssign,
  onDelete,
  onHistory,
}: LicenciasTableProps) {
  const makeActionButtons = (licencia: Licencia) => {
    const assignLabel = licencia.asignadoPara ? "Reasignar" : "Asignar";
    const buttons: ReactElement[] = [];

    if (!licencia.activoId) {
      buttons.push(
        <button
          key="edit"
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          onClick={() => onEdit(licencia)}
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
              d="M16.862 4.487l1.688-1.688a1.5 1.5 0 1 1 2.122 2.122L7 18.571l-3 1 1-3 11.862-12.084Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 19.5h12" />
          </svg>
        </button>
      );
      buttons.push(
        <button
          key="assign"
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          onClick={() => onAssign(licencia)}
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
        </button>
      );
      buttons.push(
        <button
          key="delete"
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition"
          onClick={() => onDelete(licencia)}
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
        </button>
      );
    }

    buttons.push(
      <button
        key="history"
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
        onClick={() => onHistory(licencia)}
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
      </button>
    );

    return buttons;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-0 backdrop-blur-md overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto px-4 sm:px-0">
        <div className="block lg:hidden space-y-4">
          {items.map((licencia) => (
            <div
              key={licencia._id}
              className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="text-sm text-neutral-300">
                  {licencia.cuenta || "-"}
                </div>
                <div className="font-semibold truncate">
                  {licencia.tipoLicencia || "-"}
                </div>
                <ul className="mt-1 text-sm text-neutral-300 space-y-1">
                  <li>
                    <span className="text-neutral-400">Proveedor:</span>{" "}
                    {licencia.proveedor || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Compra:</span>{" "}
                    {licencia.fechaCompra
                      ? new Date(licencia.fechaCompra).toLocaleDateString()
                      : "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Sucursal:</span>{" "}
                    {licencia.sucursal || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Asignado a:</span>{" "}
                    {licencia.asignadoPara || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Asignación:</span>{" "}
                    {licencia.fechaAsignacion
                      ? new Date(licencia.fechaAsignacion).toLocaleDateString()
                      : "-"}
                  </li>
                </ul>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4">
                {makeActionButtons(licencia)}
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
                <th className="text-left px-4 py-3">Cuenta</th>
                <th className="text-left px-4 py-3">Proveedor</th>
                <th className="text-left px-4 py-3">Tipo licencia</th>
                <th className="text-left px-4 py-3">Compra</th>
                <th className="text-left px-4 py-3">Sucursal</th>
                <th className="text-left px-4 py-3">Asignado a</th>
                <th className="text-left px-4 py-3">Asignación</th>
                <th className="text-left px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((licencia) => (
                <tr
                  key={licencia._id}
                  className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors"
                >
                  <td
                    className="px-4 py-2 max-w-[200px] truncate"
                    title={licencia.cuenta || undefined}
                  >
                    {licencia.cuenta || "-"}
                  </td>
                  <td className="px-4 py-2">{licencia.proveedor || "-"}</td>
                  <td
                    className="px-4 py-2 max-w-[240px] truncate"
                    title={licencia.tipoLicencia || undefined}
                  >
                    {licencia.tipoLicencia || "-"}
                  </td>
                  <td className="px-4 py-2">
                    {licencia.fechaCompra
                      ? new Date(licencia.fechaCompra).toLocaleDateString()
                      : "-"}
                  </td>
                  <td
                    className="px-4 py-2 max-w-[200px] truncate"
                    title={licencia.sucursal || undefined}
                  >
                    {licencia.sucursal || "-"}
                  </td>
                  <td
                    className="px-4 py-2 max-w-[200px] truncate"
                    title={licencia.asignadoPara || undefined}
                  >
                    {licencia.asignadoPara || "-"}
                  </td>
                  <td className="px-4 py-2">
                    {licencia.fechaAsignacion
                      ? new Date(licencia.fechaAsignacion).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="grid grid-cols-2 gap-1">
                      {makeActionButtons(licencia)}
                    </div>
                  </td>
                </tr>
              ))}
              {total === 0 && !loading && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-neutral-300"
                    colSpan={8}
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
