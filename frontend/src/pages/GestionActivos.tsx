import { useGestionActivos } from "../features/gestion-activos/hooks/useGestionActivos";
import { GestionActivosHeader } from "../features/gestion-activos/components/Header";
import { ActivosFilters } from "../features/gestion-activos/components/ActivosFilters";
import { LicenciasFilters } from "../features/gestion-activos/components/LicenciasFilters";
import { ActivosTable } from "../features/gestion-activos/components/ActivosTable";
import { LicenciasTable } from "../features/gestion-activos/components/LicenciasTable";
import { StatsView } from "../features/gestion-activos/components/StatsView";
import { ActivoFormModal } from "../features/gestion-activos/components/ActivoFormModal";
import { LicenciaFormModal } from "../features/gestion-activos/components/LicenciaFormModal";
import { AssignModal } from "../features/gestion-activos/components/AssignModal";
import { DeleteModal } from "../features/gestion-activos/components/DeleteModal";
import { HistorialModal } from "../features/gestion-activos/components/HistorialModal";
import type { Activo, Licencia } from "../features/gestion-activos/types";
import { API_BASE } from "../features/gestion-activos/constants";

export default function GestionInventario() {
  const state = useGestionActivos();

  const {
    tab,
    setTab,
    loading,
    error,
    total,
    specs,
    stats,
    usuarios,
    filtros,
    activos,
    licencias,
    modales,
    refrescar,
  } = state;

  const handleAsignarActivo = (item: Activo) => {
    modales.asignar.abrir(
      "activo",
      String(item._id || ""),
      `${item.marca || ""} ${item.modelo || ""}`.trim() || "Activo",
      item.asignadoPara || "",
      item.fechaAsignacion || ""
    );
  };

  const handleDescargarActa = (item: Activo) => {
    activos.descargarActa(item);
  };

  const handleAsignarLicencia = (item: Licencia) => {
    modales.asignar.abrir(
      "licencia",
      String(item._id || ""),
      item.tipoLicencia || "Licencia",
      item.asignadoPara || "",
      item.fechaAsignacion || ""
    );
  };

  const handleEliminarActivo = (item: Activo) => {
    modales.eliminar.abrir(
      "activo",
      String(item._id || ""),
      `${item.marca || ""} ${item.modelo || ""}`.trim() || "Activo"
    );
  };

  const handleEliminarLicencia = (item: Licencia) => {
    modales.eliminar.abrir(
      "licencia",
      String(item._id || ""),
      item.tipoLicencia || "Licencia"
    );
  };

  const handleHistorialActivo = (item: Activo) => {
    modales.historial.abrir(
      "activo",
      String(item._id || ""),
      `${item.marca || ""} ${item.modelo || ""}`.trim() || "Activo"
    );
  };

  const handleHistorialLicencia = (item: Licencia) => {
    modales.historial.abrir(
      item.activoId ? "activo" : "licencia",
      String(item.activoId || item._id || ""),
      item.tipoLicencia || "Licencia"
    );
  };

  const handleDisponibilizarLicencia = async (item: Licencia) => {
    if (!window.confirm(`¿Deseas disponibilizar la licencia "${item.tipoLicencia}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/licencias/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignadoPara: "", fechaAsignacion: "" }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Error al disponibilizar");

      await refrescar();
    } catch (err: any) {
      alert(`Error: ${err.message || "No se pudo disponibilizar la licencia"}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-0 sm:px-1 lg:px-2 xl:px-3 2xl:px-4 py-6 sm:py-8 lg:py-10">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #f97316 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #ea580c 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative mx-auto w-full">
        <GestionActivosHeader
          tab={tab}
          loading={loading}
          onTabChange={setTab}
          onReload={refrescar}
          onCreateActivo={activos.abrirCrear}
          onCreateLicencia={licencias.abrirCrear}
        />

        {tab !== "estadisticas" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <span className="text-sm text-neutral-300">{total} items</span>
            </div>

            {tab === "activos" ? (
              <ActivosFilters
                values={filtros.activos.valores}
                onChange={filtros.activos.actualizar}
                onApply={filtros.activos.aplicar}
                onReset={filtros.limpiar}
                disabled={loading}
              />
            ) : (
              <LicenciasFilters
                values={filtros.licencias.valores}
                tiposDisponibles={filtros.licencias.tiposDisponibles}
                onChange={(changes) => {
                  filtros.licencias.actualizar(changes);
                }}
                onApply={filtros.licencias.aplicar}
                onReset={filtros.limpiar}
                disabled={loading}
              />
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
            {tab === "estadisticas" ? (
              <StatsView stats={stats} />
            ) : tab === "activos" ? (
              <ActivosTable
                items={activos.items}
                total={activos.total}
                loading={loading}
                currentPage={activos.currentPage}
                totalPages={activos.totalPages}
                onPageChange={activos.goToPage}
                onEdit={activos.abrirEditar}
                onAssign={handleAsignarActivo}
                onDownloadActa={handleDescargarActa}
                onDelete={handleEliminarActivo}
                onHistory={handleHistorialActivo}
              />
            ) : (
              <LicenciasTable
                items={licencias.items}
                total={licencias.total}
                loading={loading}
                currentPage={licencias.currentPage}
                totalPages={licencias.totalPages}
                onPageChange={licencias.goToPage}
                onEdit={licencias.abrirEditar}
                onAssign={handleAsignarLicencia}
                onMakeAvailable={handleDisponibilizarLicencia}
                onDelete={handleEliminarLicencia}
                onHistory={handleHistorialLicencia}
              />
            )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      <ActivoFormModal
        open={activos.mostrarFormulario && tab === "activos"}
        isEdit={Boolean(activos.editarId)}
        loading={loading}
        form={activos.form}
        specs={specs}
        usuarios={usuarios}
        onClose={activos.cerrarFormulario}
        onSubmit={activos.enviar}
        onChange={activos.actualizarForm}
      />

      <LicenciaFormModal
        open={licencias.mostrarFormulario && tab === "licencias"}
        isEdit={Boolean(licencias.editarId)}
        loading={loading}
        form={licencias.form}
        tiposDisponibles={licencias.tiposDisponibles}
        usuarios={usuarios}
        onClose={licencias.cerrarFormulario}
        onSubmit={licencias.enviar}
        onChange={licencias.actualizarForm}
      />

      <AssignModal
        open={modales.asignar.visible}
        context={modales.asignar.contexto}
        loading={loading}
        usuarios={usuarios}
        onClose={modales.asignar.cerrar}
        onSubmit={modales.asignar.enviar}
        onChange={modales.asignar.actualizar}
      />

      <DeleteModal
        open={modales.eliminar.visible}
        context={modales.eliminar.contexto}
        loading={loading}
        onClose={modales.eliminar.cerrar}
        onSubmit={modales.eliminar.enviar}
      />

      <HistorialModal
        open={modales.historial.visible}
        title={modales.historial.titulo}
        movimientos={modales.historial.movimientos}
        onClose={modales.historial.cerrar}
      />
    </div>
  );
}
