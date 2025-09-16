import React from "react";
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
  return (
    <>
      {/* Vista móvil: tarjetas */}
      <div className="block lg:hidden divide-y divide-white/10">
        {items.map((l) => (
          <div key={l._id} className="p-4">
            <div className="font-semibold truncate">{l.cuenta || "-"}</div>
            <ul className="mt-1 text-sm text-neutral-300 space-y-1">
              <li><span className="text-neutral-400">Proveedor:</span> {l.proveedor || "-"}</li>
              <li className="truncate"><span className="text-neutral-400">Tipo:</span> {l.tipoLicencia || "-"}</li>
              <li><span className="text-neutral-400">Compra:</span> {l.fechaCompra ? new Date(l.fechaCompra).toLocaleDateString() : "-"}</li>
              <li className="truncate"><span className="text-neutral-400">Asignado a:</span> {l.asignadoPara || "-"}</li>
              <li><span className="text-neutral-400">Asignación:</span> {l.fechaAsignacion ? new Date(l.fechaAsignacion).toLocaleDateString() : "-"}</li>
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!l.activoId && (
                <>
                  <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onEdit(l)}>Editar</button>
                  <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onAssign(l)}>{l.asignadoPara ? "Reasignar" : "Asignar"}</button>
                  <button className="rounded-lg border border-red-500/40 px-3 py-1 hover:bg-red-500/20 transition" onClick={() => onDelete(l)}>Eliminar</button>
                </>
              )}
              <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onHistorial(l)}>Historial</button>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="px-4 py-6 text-center text-neutral-300">Sin resultados</div>
        )}
      </div>

      {/* Vista escritorio: tabla */}
      <div className="hidden lg:block">
        <table className="min-w-full text-sm">
          <thead className="bg-black sticky top-0 z-10 backdrop-blur">
            <tr>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Cuenta</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Proveedor</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Tipo licencia</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Compra</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Asignado a</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Asignación</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l._id} className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors">
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate" title={l.cuenta || undefined}>{l.cuenta || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">{l.proveedor || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[240px] truncate" title={l.tipoLicencia || undefined}>{l.tipoLicencia || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">{l.fechaCompra ? new Date(l.fechaCompra).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate" title={l.asignadoPara || undefined}>{l.asignadoPara || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">{l.fechaAsignacion ? new Date(l.fechaAsignacion).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    {!l.activoId && (
                      <>
                        <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onEdit(l)}>Editar</button>
                        <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onAssign(l)}>{l.asignadoPara ? "Reasignar" : "Asignar"}</button>
                        <button className="rounded-lg border border-red-500/40 px-3 py-1 hover:bg-red-500/20 transition" onClick={() => onDelete(l)}>Eliminar</button>
                      </>
                    )}
                    <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onHistorial(l)}>Historial</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center text-neutral-300" colSpan={7}>Sin resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

