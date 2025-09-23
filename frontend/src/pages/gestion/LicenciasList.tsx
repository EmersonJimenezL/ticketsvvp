import type { Licencia } from "./types";

type Props = {
  items: Licencia[];
  loading?: boolean;
  onEdit: (l: Licencia) => void;
  onAssign: (l: Licencia) => void;
  onDelete: (l: Licencia) => void;
  onHistorial: (l: Licencia) => void;
};

export default function LicenciasList({ items, loading, onEdit, onAssign, onDelete, onHistorial }: Props) {
  const makeActionButtons = (l: Licencia) => {
    const assignLabel = l.asignadoPara ? "Reasignar" : "Asignar";
    const buttons = [] as JSX.Element[];

    if (!l.activoId) {
      buttons.push(
        <button
          key="edit"
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          onClick={() => onEdit(l)}
          aria-label="Editar"
          title="Editar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.688-1.688a1.5 1.5 0 1 1 2.122 2.122L7.5 18.094l-3 1 1-3 11.362-11.607Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 19.5h12" />
          </svg>
        </button>
      );
      buttons.push(
        <button
          key="assign"
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          onClick={() => onAssign(l)}
          aria-label={assignLabel}
          title={assignLabel}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8 7-5 5m0 0 5 5M3 12h12m6 5v2a2 2 0 0 1-2 2h-3m5-18v2a2 2 0 0 1-2 2h-3" />
          </svg>
        </button>
      );
      buttons.push(
        <button
          key="delete"
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition"
          onClick={() => onDelete(l)}
          aria-label="Eliminar"
          title="Eliminar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5v7m5-7v7M4.5 6h15M7 6l.75-2h8.5L17 6m-1 0 .7 11.2a2 2 0 0 1-2 2.1H9.3a2 2 0 0 1-2-2.1L8 6" />
          </svg>
        </button>
      );
    }

    buttons.push(
      <button
        key="history"
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
        onClick={() => onHistorial(l)}
        aria-label="Historial"
        title="Historial"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 1 9 9M12 7.5V12l3 3" />
        </svg>
      </button>
    );

    return buttons;
  };

  return (
    <>
      <div className="block lg:hidden divide-y divide-white/10">
        {items.map((l) => (
          <div key={l._id} className="p-4">
            <div className="font-semibold truncate">{l.cuenta || "-"}</div>
            <ul className="mt-1 text-sm text-neutral-300 space-y-1">
              <li>
                <span className="text-neutral-400">Proveedor:</span> {l.proveedor || "-"}
              </li>
              <li className="truncate">
                <span className="text-neutral-400">Tipo:</span> {l.tipoLicencia || "-"}
              </li>
              <li>
                <span className="text-neutral-400">Compra:</span>{" "}
                {l.fechaCompra ? new Date(l.fechaCompra).toLocaleDateString() : "-"}
              </li>
              <li className="truncate">
                <span className="text-neutral-400">Asignado a:</span> {l.asignadoPara || "-"}
              </li>
              <li>
                <span className="text-neutral-400">Asignación:</span>{" "}
                {l.fechaAsignacion ? new Date(l.fechaAsignacion).toLocaleDateString() : "-"}
              </li>
            </ul>
            <div className="mt-3 grid grid-cols-4 gap-1">{makeActionButtons(l)}</div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="px-4 py-6 text-center text-neutral-300">Sin resultados</div>
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
              <th className="text-left px-4 py-3">Asignado a</th>
              <th className="text-left px-4 py-3">Asignación</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l._id} className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors">
                <td className="px-4 py-2 max-w-[200px] truncate" title={l.cuenta || undefined}>
                  {l.cuenta || "-"}
                </td>
                <td className="px-4 py-2">{l.proveedor || "-"}</td>
                <td className="px-4 py-2 max-w-[240px] truncate" title={l.tipoLicencia || undefined}>
                  {l.tipoLicencia || "-"}
                </td>
                <td className="px-4 py-2">{l.fechaCompra ? new Date(l.fechaCompra).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-2 max-w-[200px] truncate" title={l.asignadoPara || undefined}>
                  {l.asignadoPara || "-"}
                </td>
                <td className="px-4 py-2">{l.fechaAsignacion ? new Date(l.fechaAsignacion).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap items-center gap-1">{makeActionButtons(l)}</div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center text-neutral-300" colSpan={7}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
