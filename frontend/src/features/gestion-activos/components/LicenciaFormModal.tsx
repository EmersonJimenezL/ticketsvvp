import { useMemo } from "react";
import type { CentroUsuario, Licencia } from "../types";
import { OPCIONES_PROVEEDOR, OPCIONES_TIPO_LIC_MAP } from "../constants";
import { getCuentaDisplay } from "../utils/licenciaCuenta";
import { getUsuarioLabel } from "../utils/usuarios";

type LicenciaFormModalProps = {
  open: boolean;
  isEdit: boolean;
  loading: boolean;
  form: Licencia;
  tiposDisponibles: readonly { tipo: string; cantidad: number }[];
  usuarios: CentroUsuario[];
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
  usuarios,
  onClose,
  onSubmit,
  onChange,
}: LicenciaFormModalProps) {
  if (!open) return null;

  const opciones = useMemo(() => {
    const items = (usuarios || [])
      .map((user) => {
        const label = getUsuarioLabel(user);
        return { value: label, label };
      })
      .filter((item) => item.value);
    items.sort((a, b) => a.label.localeCompare(b.label, "es"));
    return items;
  }, [usuarios]);

  const valorActual = form.asignadoPara || "";
  const tieneActual = opciones.some((item) => item.value === valorActual);
  const autocompletadoPorUsuario = Boolean(valorActual.trim());
  const proveedorSeleccionado = (form.proveedor || "").toString().toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isEdit ? "Editar licencia" : "Crear licencia"}
          </h3>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 transition hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[0_8px_22px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
        </div>

        {loading && (
          <div className="mb-3 rounded-xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
            Procesando solicitud...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-neutral-300">Proveedor *</label>
            <select
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              value={proveedorSeleccionado}
              onChange={(event) => {
                const value = event.target.value as Licencia["proveedor"];
                const tiposValidos: readonly string[] =
                  value === "SAP"
                    ? OPCIONES_TIPO_LIC_MAP.SAP
                    : value === "OFFICE"
                      ? OPCIONES_TIPO_LIC_MAP.OFFICE
                      : [];
                onChange({
                  proveedor: value,
                  tipoLicencia: tiposValidos.includes(form.tipoLicencia || "")
                    ? form.tipoLicencia
                    : "",
                });
              }}
              disabled={isEdit}
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
              {!proveedorSeleccionado ? (
                <option value="" disabled>
                  Seleccione un proveedor primero
                </option>
              ) : tiposDisponibles.length === 0 ? (
                <option value="" disabled>
                  Sin tipos disponibles
                </option>
              ) : (
                tiposDisponibles.map((item) => (
                  <option key={item.tipo} value={item.tipo}>
                    {item.tipo} ({item.cantidad} disponible
                    {item.cantidad !== 1 ? "s" : ""})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Asignado a *</label>
            <select
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={valorActual}
              onChange={(event) =>
                onChange({ asignadoPara: event.target.value })
              }
            >
              <option value="">Seleccione</option>
              {!tieneActual && valorActual && (
                <option value={valorActual}>{valorActual}</option>
              )}
              {opciones.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Fecha de compra *
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
              Fecha de asignacion *
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

        <div className="mt-4 rounded-xl border border-white/10 p-3">
          <p className="text-sm text-neutral-300">
            Campos autocompletados desde el usuario
          </p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-300">Cuenta</label>
              <input
                className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 disabled:opacity-60"
                value={getCuentaDisplay(form.cuenta)}
                readOnly
                disabled
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300">Sucursal</label>
              <input
                className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 disabled:opacity-60"
                value={form.sucursal || ""}
                readOnly
                disabled
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300">
                Centro de Costo
              </label>
              <input
                className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 disabled:opacity-60"
                value={form.centroCosto || ""}
                readOnly
                disabled
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300">
                Area (Gerencia)
              </label>
              <input
                className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 disabled:opacity-60"
                value={form.area || ""}
                readOnly
                disabled
              />
            </div>
          </div>

          {!autocompletadoPorUsuario && (
            <p className="mt-2 text-xs text-neutral-400">
              Selecciona un usuario para completar estos campos.
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 transition hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[0_8px_22px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 font-semibold transition hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-[0_10px_24px_rgba(249,115,22,0.45)] active:translate-y-0 active:scale-[0.96] disabled:opacity-60"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
