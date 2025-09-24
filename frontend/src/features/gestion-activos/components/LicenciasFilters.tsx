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
  onApply,
  onReset,
  disabled,
}: LicenciasFiltersProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-neutral-300">Asignado a</label>
        <input
          placeholder="Nombre o parte del nombre"
          className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          value={values.asignadoPara}
          onChange={(event) =>
            onChange({ asignadoPara: event.target.value })
          }
        />
      </div>
      <div>
        <label className="block text-sm text-neutral-300">Cuenta</label>
        <input
          className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          value={values.cuenta}
          onChange={(event) => onChange({ cuenta: event.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-300">Sucursal</label>
        <select
          className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          value={values.sucursal}
          onChange={(event) =>
            onChange({ sucursal: event.target.value as "" | Sucursal })
          }
        >
          <option value="">Todas</option>
          {OPCIONES_SUCURSAL.map((sucursal) => (
            <option key={sucursal} value={sucursal}>
              {sucursal}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-neutral-300">Proveedor</label>
        <select
          className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          value={values.proveedor}
          onChange={(event) =>
            onChange({ proveedor: event.target.value, tipoLicencia: "" })
          }
        >
          <option value="">Todos</option>
          {OPCIONES_PROVEEDOR.map((proveedor) => (
            <option key={proveedor} value={proveedor}>
              {proveedor}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-neutral-300">Tipo licencia</label>
        <select
          className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          value={values.tipoLicencia}
          onChange={(event) =>
            onChange({ tipoLicencia: event.target.value })
          }
        >
          <option value="">Todos</option>
          {tiposDisponibles.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-neutral-300">
            Comprado el (desde)
          </label>
          <input
            type="date"
            value={values.desdeCompra}
            onChange={(event) =>
              onChange({ desdeCompra: event.target.value })
            }
            className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-300">
            Comprado el (hasta)
          </label>
          <input
            type="date"
            value={values.hastaCompra}
            onChange={(event) =>
              onChange({ hastaCompra: event.target.value })
            }
            className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-neutral-300">
            Asignado el (desde)
          </label>
          <input
            type="date"
            value={values.desdeAsignacion}
            onChange={(event) =>
              onChange({ desdeAsignacion: event.target.value })
            }
            className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-300">
            Asignado el (hasta)
          </label>
          <input
            type="date"
            value={values.hastaAsignacion}
            onChange={(event) =>
              onChange({ hastaAsignacion: event.target.value })
            }
            className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onApply}
          className="rounded-xl bg-orange-600 px-4 py-2 font-semibold transition hover:bg-orange-500"
          disabled={disabled}
        >
          Aplicar
        </button>
        <button
          onClick={onReset}
          className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
          disabled={disabled}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
