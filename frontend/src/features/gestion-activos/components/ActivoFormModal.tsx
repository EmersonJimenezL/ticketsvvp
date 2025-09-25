import type { Activo, Especificacion } from "../types";
import { OPCIONES_CATEGORIA, OPCIONES_SUCURSAL } from "../constants";
import type { Sucursal } from "../constants";

type ActivoFormModalProps = {
  open: boolean;
  isEdit: boolean;
  loading: boolean;
  form: Activo;
  specs: Especificacion[];
  onClose: () => void;
  onSubmit: () => void;
  onChange: (changes: Partial<Activo>) => void;
};

export function ActivoFormModal({
  open,
  isEdit,
  loading,
  form,
  specs,
  onClose,
  onSubmit,
  onChange,
}: ActivoFormModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isEdit
              ? "Editar activo (nada obligatorio al editar)"
              : "Crear activo (obligatorios)"}
          </h3>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-neutral-300">
              Categoria {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            <select
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.categoria || ""}
              onChange={(event) => onChange({ categoria: event.target.value })}
            >
              <option value="">Seleccione</option>
              {OPCIONES_CATEGORIA.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Marca {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            <input
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.marca || ""}
              onChange={(event) => onChange({ marca: event.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Modelo {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            {isEdit ? (
              <input
                className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                value={form.modelo || ""}
                onChange={(event) => onChange({ modelo: event.target.value })}
              />
            ) : (
              <select
                className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                value={form.modelo || ""}
                onChange={(event) => {
                  const value = event.target.value;
                  const spec = specs.find((item) => item.modelo === value);
                  onChange({
                    modelo: value,
                    marca: spec?.marca ?? form.marca,
                    categoria:
                      form.categoria || spec?.categoria || form.categoria,
                  });
                }}
              >
                <option value="">Seleccione un modelo</option>
                {specs.map((spec) => (
                  <option key={spec._id || spec.modelo} value={spec.modelo}>
                    {spec.modelo}
                  </option>
                ))}
              </select>
            )}
            {!isEdit && specs.length === 0 && (
              <p className="mt-1 text-xs text-amber-300">
                No hay modelos cargados. Use "Crear modelo" para agregar uno
                nuevo.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Fecha de compra{" "}
              {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            <input
              type="date"
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.fechaCompra || ""}
              onChange={(event) =>
                onChange({ fechaCompra: event.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Numero de serie{" "}
              {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            <input
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.numeroSerie || ""}
              onChange={(event) =>
                onChange({ numeroSerie: event.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Numero de factura
            </label>
            <input
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.numeroFactura || ""}
              onChange={(event) =>
                onChange({ numeroFactura: event.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Detalles</label>
            <textarea
              rows={3}
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.detalles || ""}
              onChange={(event) => onChange({ detalles: event.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Sucursal</label>
            <select
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.sucursal || ""}
              onChange={(event) =>
                onChange({ sucursal: event.target.value as "" | Sucursal })
              }
            >
              <option value="">Seleccione</option>
              {OPCIONES_SUCURSAL.map((sucursal) => (
                <option key={sucursal} value={sucursal}>
                  {sucursal}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300">Asignado a</label>
            <input
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.asignadoPara || ""}
              onChange={(event) =>
                onChange({ asignadoPara: event.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Asignado el
            </label>
            <input
              type="date"
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.fechaAsignacion || ""}
              onChange={(event) =>
                onChange({ fechaAsignacion: event.target.value })
              }
            />
          </div>
        </div>

        {!isEdit && (
          <p className="text-xs text-neutral-400 mt-2">
            * Obligatorios solo al crear: categoria, marca, modelo, fecha de
            compra y numero de serie.
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-orange-600 px-5 py-2 font-semibold transition hover:bg-orange-500 disabled:opacity-60"
            onClick={onSubmit}
            disabled={loading}
          >
            {isEdit ? "Guardar cambios" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
