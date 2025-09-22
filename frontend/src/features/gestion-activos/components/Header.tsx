import type { TabKey } from "../types";

type HeaderProps = {
  tab: TabKey;
  loading: boolean;
  onTabChange: (tab: TabKey) => void;
  onBack: () => void;
  onLogout: () => void;
  onReload: () => void;
  onCreateActivo: () => void;
  onCreateLicencia: () => void;
};

export function GestionActivosHeader({
  tab,
  loading,
  onTabChange,
  onBack,
  onLogout,
  onReload,
  onCreateActivo,
  onCreateLicencia,
}: HeaderProps) {
  return (
    <div className="mb-6">
      <div className="mb-6 flex flex-wrap items-start md:items-end justify-between gap-4 gap-y-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Inventario
          </h1>
          <p className="text-neutral-300 text-sm">
            Activos y licencias con sus asignaciones.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={onBack}
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            type="button"
          >
            Volver
          </button>
          <button
            onClick={onLogout}
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            type="button"
          >
            Cerrar sesion
          </button>
          {tab === "activos" && (
            <button
              onClick={onCreateActivo}
              className="rounded-xl bg-orange-600 px-4 py-2 font-semibold transition hover:bg-orange-500"
            >
              Crear activo
            </button>
          )}
          {tab === "licencias" && (
            <button
              onClick={onCreateLicencia}
              className="rounded-xl bg-orange-600 px-4 py-2 font-semibold transition hover:bg-orange-500"
            >
              Crear licencia
            </button>
          )}
          <button
            onClick={onReload}
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            type="button"
            disabled={loading}
          >
            Recargar
          </button>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          className={`px-4 py-2 rounded-lg transition ${
            tab === "activos"
              ? "bg-neutral-900/70 text-neutral-100"
              : "hover:bg-white/10 text-neutral-300"
          }`}
          onClick={() => onTabChange("activos")}
        >
          Activos
        </button>
        <button
          className={`px-4 py-2 rounded-lg transition ${
            tab === "licencias"
              ? "bg-neutral-900/70 text-neutral-100"
              : "hover:bg-white/10 text-neutral-300"
          }`}
          onClick={() => onTabChange("licencias")}
        >
          Licencias
        </button>
        <button
          className={`px-4 py-2 rounded-lg transition ${
            tab === "estadisticas"
              ? "bg-neutral-900/70 text-neutral-100"
              : "hover:bg-white/10 text-neutral-300"
          }`}
          onClick={() => onTabChange("estadisticas")}
        >
          Estadisticas
        </button>
      </div>
    </div>
  );
}
