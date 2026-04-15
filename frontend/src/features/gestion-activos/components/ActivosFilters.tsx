import type { ActivoFilters } from "../types";
import { OPCIONES_CATEGORIA, OPCIONES_SUCURSAL } from "../constants";
import type { Sucursal } from "../constants";

type ActivosFiltersProps = {
  values: ActivoFilters;
  onChange: (changes: Partial<ActivoFilters>) => void;
  onApply: () => void;
  onReset: () => void;
  disabled: boolean;
};

export function ActivosFilters({
  values,
  onChange,
  onApply: _onApply,
  onReset,
  disabled,
}: ActivosFiltersProps) {
  const handleChange = (changes: Partial<ActivoFilters>) => {
    onChange(changes);
  };

  return (
    <div className="flex flex-wrap items-start gap-3">
      <select
        className="w-full rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 sm:w-auto"
        value={values.categoria}
        onChange={(event) => handleChange({ categoria: event.target.value })}
      >
        <option value="">Todas las categorías</option>
        {OPCIONES_CATEGORIA.map((categoria) => (
          <option key={categoria} value={categoria}>
            {categoria}
          </option>
        ))}
      </select>

      <input
        type="text"
        className="w-full rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 sm:w-[320px]"
        value={values.busqueda || ""}
        onChange={(event) => handleChange({ busqueda: event.target.value })}
        placeholder="Buscar por marca, modelo, serie, sucursal, asignado..."
      />

      <select
        className="w-full rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 sm:w-auto"
        value={values.sucursal}
        onChange={(event) =>
          handleChange({ sucursal: event.target.value as "" | Sucursal })
        }
      >
        <option value="">Todas las sucursales</option>
        {OPCIONES_SUCURSAL.map((sucursal) => (
          <option key={sucursal} value={sucursal}>
            {sucursal}
          </option>
        ))}
      </select>

      <label className="inline-flex w-full items-center gap-2 text-sm text-neutral-300 sm:w-auto">
        <input
          type="checkbox"
          checked={values.soloSinAsignacion}
          onChange={(event) =>
            handleChange({ soloSinAsignacion: event.target.checked })
          }
          className="rounded"
        />
        <span>Solo sin asignación</span>
      </label>

      <button
        onClick={onReset}
        className="w-full rounded-lg border border-white/10 px-3 py-1.5 text-sm transition hover:bg-white/10 sm:ml-auto sm:w-auto"
        disabled={disabled}
      >
        Limpiar
      </button>
    </div>
  );
}
