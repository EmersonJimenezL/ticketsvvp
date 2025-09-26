import type { Licencia } from "../types";
import {
  OPCIONES_PROVEEDOR,
  OPCIONES_SUCURSAL,
  OPCIONES_TIPO_LIC_MAP,
} from "../constants";
import type { Sucursal } from "../constants";

type LicenciaFormModalProps = {
  open: boolean;
  isEdit: boolean;
  loading: boolean;
  form: Licencia;
  tiposDisponibles: readonly string[];
  onClose: () => void;
  onSubmit: () => void;
  onChange: (changes: Partial<Licencia>) => void;
};

export function LicenciaFormModal({
  open,
  isEdit,
  loading,
  form,
  tiposDisponibles,
  onClose,
  onSubmit,
  onChange,
}: LicenciaFormModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isEdit ? "Editar licencia" : "Crear licencia"}
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
            <label className="block text-sm text-neutral-300">Cuenta *</label>
            <input
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.cuenta || ""}
              onChange={(event) => onChange({ cuenta: event.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300">
              Proveedor *
            </label>
            <select
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.proveedor || ""}
              onChange={(event) => {
                const value = event.target.value as Licencia["proveedor"];
                const tiposValidos: readonly string[] =
                  value === "SAP"
                    ? OPCIONES_TIPO_LIC_MAP.SAP
                    : value === "Office"
                    ? OPCIONES_TIPO_LIC_MAP.Office
                    : [];
                onChange({
                  proveedor: value,
                  tipoLicencia: tiposValidos.includes(form.tipoLicencia || "")
                    ? form.tipoLicencia
                    : "",
                });
              }}
            >
              <option value="">Seleccione</option>
              {OPCIONES_PROVEEDOR.map((proveedor) => (
                <option key={proveedor} value={proveedor}>
                  {proveedor}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300">
              Tipo licencia *
            </label>
            <select
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.tipoLicencia || ""}
              onChange={(event) =>
                onChange({ tipoLicencia: event.target.value })
              }
            >
              <option value="">Seleccione</option>
              {tiposDisponibles.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300">
              Fecha de compra
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
