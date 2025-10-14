import type { LicenciaFilters } from "../types";
import { OPCIONES_PROVEEDOR, OPCIONES_SUCURSAL } from "../constants";
import type { Sucursal } from "../constants";

type LicenciasFiltersProps = {
  values: LicenciaFilters;
  tiposDisponibles: readonly string[];
  onChange: (changes: Partial<LicenciaFilters>) => void;
  onApply: () => void;
  onReset: () => void;
  disabled: boolean;
};

export function LicenciasFilters({
  values,
  tiposDisponibles,
  onChange,
  onApply: _onApply,
  onReset,
  disabled,
}: LicenciasFiltersProps) {
  const handleChange = (changes: Partial<LicenciaFilters>) => {
    onChange(changes);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        className="rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
        value={values.cuenta}
        onChange={(event) => handleChange({ cuenta: event.target.value })}
        placeholder="Buscar cuenta..."
      />

      <select
        className="rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
        value={values.proveedor}
        onChange={(event) =>
          handleChange({ proveedor: event.target.value, tipoLicencia: "" })
        }
      >
        <option value="">Todos los proveedores</option>
        {OPCIONES_PROVEEDOR.map((proveedor) => (
          <option key={proveedor} value={proveedor}>
            {proveedor}
          </option>
        ))}
      </select>

      <select
        className="rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
        value={values.tipoLicencia}
        onChange={(event) => handleChange({ tipoLicencia: event.target.value })}
      >
        <option value="">Todos los tipos</option>
        {tiposDisponibles.map((tipo) => (
          <option key={tipo} value={tipo}>
            {tipo}
          </option>
        ))}
      </select>

      <input
        placeholder="Asignado a..."
        className="rounded-lg bg-neutral-900/70 px-3 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
        value={values.asignadoPara}
        onChange={(event) => handleChange({ asignadoPara: event.target.value })}
      />

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
          checked={values.soloDisponibles}
          onChange={(event) =>
            handleChange({ soloDisponibles: event.target.checked })
          }
          className="rounded"
        />
        <span>Solo disponibles</span>
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
