import type { ActivoFilters } from "../types";
import { OPCIONES_CATEGORIA } from "../constants";

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
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-neutral-300">Categoria</label>
        <select
          className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          value={values.categoria}
          onChange={(event) =>
            onChange({ categoria: event.target.value })
          }
        >
          <option value="">Todas</option>
          {OPCIONES_CATEGORIA.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
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

      <div>
        <label className="block text-sm text-neutral-300">Sucursal</label>
        <input
          className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          value={values.sucursal}
          onChange={(event) =>
            onChange({ sucursal: event.target.value })
          }
        />
      </div>

      <label className="inline-flex items-center gap-2 text-neutral-300">
        <input
          type="checkbox"
          checked={values.soloSinAsignacion}
          onChange={(event) =>
            onChange({ soloSinAsignacion: event.target.checked })
          }
        />
        <span>Solo sin asignacion</span>
      </label>

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
