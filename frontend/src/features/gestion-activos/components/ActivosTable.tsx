import { useState } from "react";
import { DataTable, type Column, type Action } from "./DataTable";
import { Pagination } from "./Pagination";
import type { Activo } from "../types";

type ActivosTableProps = {
  items: Activo[];
  total: number;
  loading: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onEdit: (item: Activo) => void;
  onAssign: (item: Activo) => void;
  onDownloadActa: (item: Activo) => void;
  onDelete: (item: Activo) => void;
  onHistory: (item: Activo) => void;
};

export function ActivosTable({
  items,
  total: _total,
  loading,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onEdit,
  onAssign,
  onDownloadActa,
  onDelete,
  onHistory,
}: ActivosTableProps) {
  const [selectedActivo, setSelectedActivo] = useState<Activo | null>(null);

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString() : "-";

  const columns: Column<Activo>[] = [
    {
      key: "categoria",
      label: "Categoria",
      render: (activo) => activo.categoria || "-",
    },
    {
      key: "marca",
      label: "Marca",
      render: (activo) => activo.marca || "-",
    },
    {
      key: "modelo",
      label: "Modelo",
      render: (activo) => activo.modelo || "-",
      className: "max-w-[200px] truncate",
    },
    {
      key: "numeroSerie",
      label: "Serie",
      render: (activo) => activo.numeroSerie || "-",
      className: "max-w-[200px] truncate",
    },
    {
      key: "sucursal",
      label: "Sucursal",
      render: (activo) => activo.sucursal || "-",
      className: "max-w-[200px] truncate",
    },
    {
      key: "centroCosto",
      label: "Centro Costo",
      render: (activo) => activo.centroCosto || "-",
      className: "max-w-[150px] truncate",
    },
    {
      key: "fechaCompra",
      label: "Compra",
      render: (activo) => formatDate(activo.fechaCompra),
    },
    {
      key: "numeroFactura",
      label: "Factura",
      render: (activo) => activo.numeroFactura || "-",
      className: "max-w-[200px] truncate",
    },
    {
      key: "detalles",
      label: "Detalles",
      render: (activo) => (
        <span title={activo.detalles || undefined}>{activo.detalles || "-"}</span>
      ),
      className: "w-[170px] max-w-[170px] truncate",
    },
    {
      key: "asignadoPara",
      label: "Asignado a",
      render: (activo) => activo.asignadoPara || "-",
      className: "max-w-[200px] truncate",
    },
    {
      key: "fechaAsignacion",
      label: "Asignacion",
      render: (activo) => formatDate(activo.fechaAsignacion),
    },
  ];

  const actions: Action<Activo>[] = [
    {
      label: "Editar",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.688-1.688a1.5 1.5 0 1 1 2.122 2.122L7.5 18.094l-3 1 1-3 11.362-11.607Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 19.5h12" />
        </svg>
      ),
      onClick: onEdit,
      className:
        "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 transition text-neutral-700",
    },
    {
      label: "Asignar",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8 7-5 5m0 0 5 5M3 12h12m6 5v2a2 2 0 0 1-2 2h-3m5-18v2a2 2 0 0 1-2 2h-3" />
        </svg>
      ),
      onClick: onAssign,
      className:
        "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 transition text-neutral-700",
    },
    {
      label: "Acta",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v6m0 0l-3-3m3 3l3-3" />
        </svg>
      ),
      onClick: onDownloadActa,
      disabled: (activo) => !activo.asignadoPara,
      className:
        "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 transition text-neutral-700",
    },
    {
      label: "Eliminar",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5v7m5-7v7M4.5 6h15M7 6l.75-2h8.5L17 6m-1 0 .7 11.2a2 2 0 0 1-2 2.1H9.3a2 2 0 0 1-2-2.1L8 6" />
        </svg>
      ),
      onClick: onDelete,
      className:
        "flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition",
    },
    {
      label: "Historial",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 1 9 9M12 7.5V12l3 3" />
        </svg>
      ),
      onClick: onHistory,
      className:
        "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 transition text-neutral-700",
    },
  ];

  return (
    <>
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={items}
            actions={actions}
            keyExtractor={(activo) => activo._id || ""}
            emptyMessage="Sin resultados"
            loading={loading}
            onRowClick={setSelectedActivo}
          />
        </div>
        {!loading && items.length > 0 && (
          <div className="border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500">
            Haz clic en una fila para ver el detalle completo del activo.
          </div>
        )}

        {totalPages > 1 && onPageChange && (
          <div className="px-4 py-4 border-t border-neutral-200 bg-white">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              hasNextPage={currentPage < totalPages}
              hasPrevPage={currentPage > 1}
            />
          </div>
        )}
      </div>

      {selectedActivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setSelectedActivo(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-white p-6 text-neutral-900 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Detalle del activo</h3>
                <p className="text-sm text-neutral-500">
                  {`${selectedActivo.marca || "-"} ${selectedActivo.modelo || "-"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivo(null)}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Categoria</p>
                <p className="mt-1 text-sm">{selectedActivo.categoria || "-"}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Marca</p>
                <p className="mt-1 text-sm">{selectedActivo.marca || "-"}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Modelo</p>
                <p className="mt-1 text-sm">{selectedActivo.modelo || "-"}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Serie</p>
                <p className="mt-1 text-sm">{selectedActivo.numeroSerie || "-"}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Sucursal</p>
                <p className="mt-1 text-sm">{selectedActivo.sucursal || "-"}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Centro costo</p>
                <p className="mt-1 text-sm">{selectedActivo.centroCosto || "-"}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Fecha compra</p>
                <p className="mt-1 text-sm">{formatDate(selectedActivo.fechaCompra)}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Factura</p>
                <p className="mt-1 text-sm">{selectedActivo.numeroFactura || "-"}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Asignado a</p>
                <p className="mt-1 text-sm">{selectedActivo.asignadoPara || "-"}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Fecha asignacion</p>
                <p className="mt-1 text-sm">{formatDate(selectedActivo.fechaAsignacion)}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase text-neutral-500">Numero acta</p>
                <p className="mt-1 text-sm break-words">
                  {Array.isArray(selectedActivo.numeroacta) &&
                  selectedActivo.numeroacta.length > 0
                    ? selectedActivo.numeroacta.join(", ")
                    : "-"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase text-neutral-500">Detalles</p>
                <p className="mt-1 whitespace-pre-line text-sm">
                  {selectedActivo.detalles || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Creado</p>
                <p className="mt-1 text-sm">{formatDate(selectedActivo.createdAt)}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Actualizado</p>
                <p className="mt-1 text-sm">{formatDate(selectedActivo.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
