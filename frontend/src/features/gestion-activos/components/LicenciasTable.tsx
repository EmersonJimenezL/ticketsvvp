import { DataTable, type Column, type Action } from "./DataTable";
import { Pagination } from "./Pagination";
import type { Licencia } from "../types";

type LicenciasTableProps = {
  items: Licencia[];
  total: number;
  loading: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onEdit: (licencia: Licencia) => void;
  onAssign: (licencia: Licencia) => void;
  onDelete: (licencia: Licencia) => void;
  onHistory: (licencia: Licencia) => void;
};

export function LicenciasTable({
  items,
  total,
  loading,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onEdit,
  onAssign,
  onDelete,
  onHistory,
}: LicenciasTableProps) {
  const columns: Column<Licencia>[] = [
    {
      key: "cuenta",
      label: "Cuenta",
      render: (licencia) => licencia.cuenta || "-",
      className: "max-w-[200px] truncate",
    },
    {
      key: "proveedor",
      label: "Proveedor",
      render: (licencia) => licencia.proveedor || "-",
    },
    {
      key: "tipoLicencia",
      label: "Tipo licencia",
      render: (licencia) => licencia.tipoLicencia || "-",
      className: "max-w-[240px] truncate",
    },
    {
      key: "fechaCompra",
      label: "Compra",
      render: (licencia) =>
        licencia.fechaCompra
          ? new Date(licencia.fechaCompra).toLocaleDateString()
          : "-",
    },
    {
      key: "sucursal",
      label: "Sucursal",
      render: (licencia) => licencia.sucursal || "-",
      className: "max-w-[200px] truncate",
    },
    {
      key: "centroCosto",
      label: "Centro Costo",
      render: (licencia) => licencia.centroCosto || "-",
      className: "max-w-[150px] truncate",
    },
    {
      key: "asignadoPara",
      label: "Asignado a",
      render: (licencia) => licencia.asignadoPara || "-",
      className: "max-w-[200px] truncate",
    },
    {
      key: "fechaAsignacion",
      label: "Asignación",
      render: (licencia) =>
        licencia.fechaAsignacion
          ? new Date(licencia.fechaAsignacion).toLocaleDateString()
          : "-",
    },
  ];

  const actions: Action<Licencia>[] = [
    {
      label: "Editar",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.688-1.688a1.5 1.5 0 1 1 2.122 2.122L7 18.571l-3 1 1-3 11.862-12.084Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 19.5h12" />
        </svg>
      ),
      onClick: onEdit,
      className:
        "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition",
      disabled: (licencia) => Boolean(licencia.activoId),
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
      disabled: (licencia) => Boolean(licencia.activoId),
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
      disabled: (licencia) => Boolean(licencia.activoId),
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
          keyExtractor={(licencia) => licencia._id || ""}
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
