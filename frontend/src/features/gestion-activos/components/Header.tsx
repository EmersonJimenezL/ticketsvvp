import type { TabKey } from "../types";
import AppHeader from "../../../components/AppHeader";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  return (
    <div className="mb-4">
      <AppHeader
        title="Inventario"
        subtitle="Activos y licencias con sus asignaciones"
        backTo="/admin"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="grid w-full grid-cols-1 gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:w-auto sm:grid-cols-3">
          <button
            className={`w-full rounded-lg px-3 py-1.5 text-sm transition ${
              tab === "activos"
                ? "bg-orange-600 text-white"
                : "hover:bg-white/10 text-neutral-300"
            }`}
            onClick={() => onTabChange("activos")}
          >
            Activos
          </button>
          <button
            className={`w-full rounded-lg px-3 py-1.5 text-sm transition ${
              tab === "licencias"
                ? "bg-orange-600 text-white"
                : "hover:bg-white/10 text-neutral-300"
            }`}
            onClick={() => onTabChange("licencias")}
          >
            Licencias
          </button>
          <button
            className={`w-full rounded-lg px-3 py-1.5 text-sm transition ${
              tab === "estadisticas"
                ? "bg-orange-600 text-white"
                : "hover:bg-white/10 text-neutral-300"
            }`}
            onClick={() => onTabChange("estadisticas")}
          >
            Resumen de licencias
          </button>
        </div>

        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <button
            onClick={() => navigate("/admin/modelos")}
            className="w-full rounded-xl border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/10 sm:w-auto"
            type="button"
          >
            Ir a modelos
          </button>
          {tab === "activos" && (
            <button
              onClick={onCreateActivo}
              className="w-full rounded-xl bg-orange-600 px-3 py-1.5 text-sm font-semibold transition hover:bg-orange-500 sm:w-auto"
            >
              Crear activo
            </button>
          )}
          {tab === "licencias" && (
            <button
              onClick={onCreateLicencia}
              className="w-full rounded-xl bg-orange-600 px-3 py-1.5 text-sm font-semibold transition hover:bg-orange-500 sm:w-auto"
            >
              Crear licencia
            </button>
          )}
          <button
            onClick={onReload}
            className="w-full rounded-xl border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/10 sm:w-auto"
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
