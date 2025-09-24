import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useGestionActivosState } from "../features/gestion-activos/hooks/useGestionActivosState";
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

export default function GestionInventario() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const state = useGestionActivosState();

  const {
    tab,
    setTab,
    loading,
    error,
    total,
    specs,
    stats,
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
          onBack={() => navigate(-1)}
          onLogout={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          onReload={refrescar}
          onCreateActivo={activos.abrirCrear}
          onCreateLicencia={licencias.abrirCrear}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6">
          {tab !== "estadisticas" && (
            <aside className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md lg:sticky lg:top-4 self-start">
              <div className="flex items-center justify-between mb-2">
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
            </aside>
          )}

          <section
            className={
              tab === "estadisticas"
                ? "lg:col-span-12"
                : "lg:col-span-10 flex flex-col gap-4"
            }
          >
            {tab === "estadisticas" ? (
              <StatsView stats={stats} />
            ) : tab === "activos" ? (
              <ActivosTable
                items={activos.items}
                total={activos.total}
                loading={loading}
                hasMore={activos.tieneMas}
                onLoadMore={activos.verMas}
                onEdit={activos.abrirEditar}
                onAssign={handleAsignarActivo}
                onDelete={handleEliminarActivo}
                onHistory={handleHistorialActivo}
              />
            ) : (
              <LicenciasTable
                items={licencias.items}
                total={licencias.total}
                loading={loading}
                hasMore={licencias.tieneMas}
                onLoadMore={licencias.verMas}
                onEdit={licencias.abrirEditar}
                onAssign={handleAsignarLicencia}
                onDelete={handleEliminarLicencia}
                onHistory={handleHistorialLicencia}
              />
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
                {error}
              </div>
            )}
          </section>
        </div>
      </div>

      <ActivoFormModal
        open={activos.mostrarFormulario && tab === "activos"}
        isEdit={Boolean(activos.editarId)}
        loading={loading}
        form={activos.form}
        specs={specs}
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
        onClose={licencias.cerrarFormulario}
        onSubmit={licencias.enviar}
        onChange={licencias.actualizarForm}
      />

      <AssignModal
        open={modales.asignar.visible}
        context={modales.asignar.contexto}
        loading={loading}
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
