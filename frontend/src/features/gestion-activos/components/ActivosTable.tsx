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
  onDelete,
  onHistory,
}: ActivosTableProps) {
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
      render: (activo) =>
        activo.fechaCompra
          ? new Date(activo.fechaCompra).toLocaleDateString()
          : "-",
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
      render: (activo) => activo.detalles || "-",
      className: "max-w-[260px] truncate",
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
      render: (activo) =>
        activo.fechaAsignacion
          ? new Date(activo.fechaAsignacion).toLocaleDateString()
          : "-",
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
        "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition",
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
        "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition",
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
        "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition",
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={items}
          actions={actions}
          keyExtractor={(activo) => activo._id || ""}
          emptyMessage="Sin resultados"
          loading={loading}
        />
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="px-4 py-4 border-t border-white/10 bg-white/5">
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
  );
}
