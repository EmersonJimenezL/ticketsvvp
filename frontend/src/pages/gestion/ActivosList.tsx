import React from "react";
import type { Activo } from "./types";

type Props = {
  items: Activo[];
  loading?: boolean;
  onEdit: (a: Activo) => void;
  onAssign: (a: Activo) => void;
  onDelete: (a: Activo) => void;
  onHistorial: (a: Activo) => void;
};

export default function ActivosList({ items, loading, onEdit, onAssign, onDelete, onHistorial }: Props) {
  return (
    <>
      {/* Vista móvil: tarjetas */}
      <div className="block lg:hidden divide-y divide-white/10">
        {items.map((a) => (
          <div key={a._id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-neutral-300">{a.categoria || "-"}</div>
                <div className="font-semibold truncate">{(a.marca || "") + " " + (a.modelo || "-")}</div>
                <ul className="mt-1 text-sm text-neutral-300 space-y-1">
                  <li>
                    <span className="text-neutral-400">Serie:</span> {a.numeroSerie || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Compra:</span> {a.fechaCompra ? new Date(a.fechaCompra).toLocaleDateString() : "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Asignado a:</span> {a.asignadoPara || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Asignación:</span> {a.fechaAsignacion ? new Date(a.fechaAsignacion).toLocaleDateString() : "-"}
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onEdit(a)}>Editar</button>
              <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onAssign(a)}>{a.asignadoPara ? "Reasignar" : "Asignar"}</button>
              <button className="rounded-lg border border-red-500/40 px-3 py-1 hover:bg-red-500/20 transition" onClick={() => onDelete(a)}>Eliminar</button>
              <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onHistorial(a)}>Historial</button>
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
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Categoría</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Marca</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Modelo</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Serie</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Compra</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Asignado a</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Asignación</th>
              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a._id} className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors">
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">{a.categoria || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">{a.marca || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate" title={a.modelo || undefined}>{a.modelo || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate" title={a.numeroSerie || undefined}>{a.numeroSerie || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">{a.fechaCompra ? new Date(a.fechaCompra).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate" title={a.asignadoPara || undefined}>{a.asignadoPara || "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">{a.fechaAsignacion ? new Date(a.fechaAsignacion).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onEdit(a)}>Editar</button>
                    <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onAssign(a)}>{a.asignadoPara ? "Reasignar" : "Asignar"}</button>
                    <button className="rounded-lg border border-red-500/40 px-3 py-1 hover:bg-red-500/20 transition" onClick={() => onDelete(a)}>Eliminar</button>
                    <button className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition" onClick={() => onHistorial(a)}>Historial</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-6 text-center text-neutral-300" colSpan={8}>Sin resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

