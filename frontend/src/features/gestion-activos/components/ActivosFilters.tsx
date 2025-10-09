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
  onApply,
  onReset,
  disabled,
}: ActivosFiltersProps) {
  const handleChange = (changes: Partial<ActivoFilters>) => {
    onChange(changes);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        className="rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
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

      <select
        className="rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
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

      <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
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
        className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 transition"
        disabled={disabled}
      >
        Limpiar
      </button>
    </div>
  );
}
