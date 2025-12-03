import type { TabKey } from "../types";
import AppHeader from "../../../components/AppHeader";

type HeaderProps = {
  tab: TabKey;
  loading: boolean;
  onTabChange: (tab: TabKey) => void;
  onReload: () => void;
  onCreateActivo: () => void;
  onCreateLicencia: () => void;
};

export function GestionActivosHeader({
  tab,
  loading,
  onTabChange,
  onReload,
  onCreateActivo,
  onCreateLicencia,
}: HeaderProps) {
  return (
    <div className="mb-4">
      <AppHeader
        title="Inventario"
        subtitle="Activos y licencias con sus asignaciones"
        backTo="/admin"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              tab === "activos"
                ? "bg-orange-600 text-white"
                : "hover:bg-white/10 text-neutral-300"
            }`}
            onClick={() => onTabChange("activos")}
          >
            Activos
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              tab === "licencias"
                ? "bg-orange-600 text-white"
                : "hover:bg-white/10 text-neutral-300"
            }`}
            onClick={() => onTabChange("licencias")}
          >
            Licencias
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              tab === "estadisticas"
                ? "bg-orange-600 text-white"
                : "hover:bg-white/10 text-neutral-300"
            }`}
            onClick={() => onTabChange("estadisticas")}
          >
            Resumen de licencias
          </button>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {tab === "activos" && (
            <button
              onClick={onCreateActivo}
              className="rounded-xl bg-orange-600 px-3 py-1.5 text-sm font-semibold transition hover:bg-orange-500"
            >
              Crear activo
            </button>
          )}
          {tab === "licencias" && (
            <button
              onClick={onCreateLicencia}
              className="rounded-xl bg-orange-600 px-3 py-1.5 text-sm font-semibold transition hover:bg-orange-500"
            >
              Crear licencia
            </button>
          )}
          <button
            onClick={onReload}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 transition"
            type="button"
            disabled={loading}
          >
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}
