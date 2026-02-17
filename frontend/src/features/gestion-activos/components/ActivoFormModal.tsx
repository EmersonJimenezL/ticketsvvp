import { useEffect, useMemo, useRef, useState } from "react";
import type { Activo, Especificacion, CentroUsuario } from "../types";
import { OPCIONES_CATEGORIA, OPCIONES_SUCURSAL, OPCIONES_CENTRO_COSTO } from "../constants";
import type { Sucursal } from "../constants";
import type { CentroCosto } from "../types";
import { getUsuarioLabel } from "../utils/usuarios";
import type { ValidationError } from "../validation/activoValidation";

type ActivoFormModalProps = {
  open: boolean;
  isEdit: boolean;
  loading: boolean;
  form: Activo;
  specs: Especificacion[];
  usuarios: CentroUsuario[];
  validationErrors?: ValidationError[];
  submitError?: string | null;
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
  usuarios,
  validationErrors = [],
  submitError = null,
  onClose,
  onSubmit,
  onChange,
}: ActivoFormModalProps) {
  if (!open) {
    return null;
  }
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);
  const [selectedSpecKey, setSelectedSpecKey] = useState("");

  const opciones = useMemo(() => {
    const items = (usuarios || [])
      .map((user) => ({
        value: getUsuarioLabel(user),
        label: getUsuarioLabel(user),
      }))
      .filter((item) => item.value);
    items.sort((a, b) => a.label.localeCompare(b.label, "es"));
    return items;
  }, [usuarios]);

  const valorActual = form.asignadoPara || "";
  const tieneActual = opciones.some((item) => item.value === valorActual);
  const getSpecKey = (spec: Especificacion, index: number) =>
    spec._id
      ? `id:${spec._id}`
      : `idx:${index}:${spec.modelo}:${spec.ram || ""}:${spec.almacenamiento || ""}:${spec.procesador || ""}`;

  const fallbackSelectedSpecKey = useMemo(() => {
    if (!form.modelo) return "";
    const firstIndex = specs.findIndex((item) => item.modelo === form.modelo);
    if (firstIndex < 0) return "";
    return getSpecKey(specs[firstIndex], firstIndex);
  }, [form.modelo, specs]);

  const activeSelectedSpecKey = selectedSpecKey || fallbackSelectedSpecKey;

  const selectedModel = useMemo(() => {
    if (activeSelectedSpecKey) {
      const byKey = specs.find((item, index) => getSpecKey(item, index) === activeSelectedSpecKey);
      if (byKey) return byKey;
    }
    return specs.find((item) => item.modelo === (form.modelo || ""));
  }, [activeSelectedSpecKey, form.modelo, specs]);
  const hasValidationErrors = validationErrors.length > 0;

  const formatModelOption = (spec: Especificacion) => {
    const detalles: string[] = [];
    if (spec.ram?.trim()) {
      detalles.push(`RAM: ${spec.ram.trim()}`);
    }
    if (spec.almacenamiento?.trim()) {
      detalles.push(`Almacenamiento: ${spec.almacenamiento.trim()}`);
    }
    if (spec.procesador?.trim()) {
      detalles.push(`CPU: ${spec.procesador.trim()}`);
    }

    return detalles.length > 0
      ? `${spec.modelo} | ${detalles.join(" | ")}`
      : spec.modelo;
  };
  const formatModelDetail = (spec: Especificacion) => {
    const detalles: string[] = [];
    if (spec.ram?.trim()) {
      detalles.push(`RAM: ${spec.ram.trim()}`);
    }
    if (spec.almacenamiento?.trim()) {
      detalles.push(`Almacenamiento: ${spec.almacenamiento.trim()}`);
    }
    if (spec.procesador?.trim()) {
      detalles.push(`CPU: ${spec.procesador.trim()}`);
    }
    return detalles.length > 0 ? detalles.join(" | ") : "Sin especificaciones";
  };
  const getFieldError = (field: string) =>
    validationErrors.find((error) => error.field === field)?.message || null;
  const hasFieldError = (field: string) => Boolean(getFieldError(field));
  const getInputClassName = (field?: string) =>
    `w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 transition focus:ring-2 ${
      field && hasFieldError(field)
        ? "ring-red-400/70 focus:ring-red-400"
        : "ring-white/10 focus:ring-orange-500"
    }`;

  const handleSelectModel = (spec: Especificacion | null, index?: number) => {
    if (!spec) {
      onChange({ modelo: "" });
      setSelectedSpecKey("");
      setModelDropdownOpen(false);
      return;
    }
    onChange({
      modelo: spec.modelo,
      marca: spec?.marca ?? form.marca,
      categoria: form.categoria || spec?.categoria || form.categoria,
    });
    setSelectedSpecKey(getSpecKey(spec, index ?? 0));
    setModelDropdownOpen(false);
  };

  useEffect(() => {
    if (!open) {
      setSelectedSpecKey("");
    }
  }, [open]);

  useEffect(() => {
    if (!modelDropdownOpen) {
      return;
    }

    const handleOutside = (event: MouseEvent) => {
      if (!modelDropdownRef.current) {
        return;
      }
      if (!modelDropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModelDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [modelDropdownOpen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isEdit
              ? "Editar activo (nada obligatorio al editar)"
              : "Crear activo (obligatorios)"}
          </h3>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
        </div>

        {(submitError || hasValidationErrors) && (
          <div className="mb-4 rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="font-semibold">
              {submitError || "Hay campos pendientes por completar."}
            </div>
            {hasValidationErrors && (
              <ul className="mt-2 list-disc pl-5 text-red-100/90">
                {validationErrors.slice(0, 4).map((error) => (
                  <li key={`${error.field}-${error.message}`}>{error.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-neutral-300">
              Categoria {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            <select
              className={getInputClassName("categoria")}
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
            {getFieldError("categoria") && (
              <p className="mt-1 text-xs text-red-300">{getFieldError("categoria")}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Marca {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            <input
              className={getInputClassName("marca")}
              value={form.marca || ""}
              onChange={(event) => onChange({ marca: event.target.value })}
            />
            {getFieldError("marca") && (
              <p className="mt-1 text-xs text-red-300">{getFieldError("marca")}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Modelo {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            {isEdit ? (
              <input
                className={getInputClassName("modelo")}
                value={form.modelo || ""}
                onChange={(event) => onChange({ modelo: event.target.value })}
              />
            ) : (
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl bg-neutral-900/70 px-3 py-2 text-left outline-none ring-1 transition focus:ring-2 ${
                    hasFieldError("modelo")
                      ? "ring-red-400/70 focus:ring-red-400"
                      : "ring-white/10 focus:ring-orange-500"
                  }`}
                  onClick={() => setModelDropdownOpen((openState) => !openState)}
                  disabled={loading}
                >
                  <span className="truncate">
                    {selectedModel
                      ? formatModelOption(selectedModel)
                      : form.modelo || "Seleccione un modelo"}
                  </span>
                  <span className="ml-3 text-xs text-neutral-300">▼</span>
                </button>

                {modelDropdownOpen && (
                  <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
                    <button
                      type="button"
                      className={`w-full border-b border-white/10 px-3 py-2 text-left text-sm transition hover:bg-white/10 ${
                        !form.modelo ? "bg-orange-500/20 text-white" : ""
                      }`}
                      onClick={() => handleSelectModel(null)}
                    >
                      Seleccione un modelo
                    </button>

                    <div className="max-h-72 overflow-y-auto">
                      {specs.map((spec, index) => {
                        const specKey = getSpecKey(spec, index);
                        const isSelected = activeSelectedSpecKey === specKey;
                        return (
                          <button
                            key={specKey}
                            type="button"
                            className={`w-full border-b border-white/10 px-3 py-2 text-left transition last:border-b-0 hover:bg-white/10 ${
                              isSelected ? "bg-orange-500/20" : ""
                            }`}
                            onClick={() => handleSelectModel(spec, index)}
                            title={formatModelOption(spec)}
                          >
                            <div className="truncate text-sm font-medium">
                              {spec.modelo}
                            </div>
                            <div className="truncate text-xs text-neutral-300">
                              {formatModelDetail(spec)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {getFieldError("modelo") && (
              <p className="mt-1 text-xs text-red-300">{getFieldError("modelo")}</p>
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
              className={getInputClassName("fechaCompra")}
              value={form.fechaCompra || ""}
              onChange={(event) =>
                onChange({ fechaCompra: event.target.value })
              }
            />
            {getFieldError("fechaCompra") && (
              <p className="mt-1 text-xs text-red-300">{getFieldError("fechaCompra")}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Numero de serie{" "}
              {!isEdit && <span className="text-orange-400">*</span>}
            </label>
            <input
              className={getInputClassName("numeroSerie")}
              value={form.numeroSerie || ""}
              onChange={(event) =>
                onChange({ numeroSerie: event.target.value })
              }
            />
            {getFieldError("numeroSerie") && (
              <p className="mt-1 text-xs text-red-300">{getFieldError("numeroSerie")}</p>
            )}
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
            <label className="block text-sm text-neutral-300">Centro de Costo</label>
            <select
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
              value={form.centroCosto || ""}
              onChange={(event) =>
                onChange({ centroCosto: event.target.value as "" | CentroCosto })
              }
            >
              <option value="">Seleccione</option>
              {OPCIONES_CENTRO_COSTO.map((centro) => (
                <option key={centro} value={centro}>
                  {centro}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300">Asignado a</label>
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
              Asignado el
            </label>
            <input
              type="date"
              className={getInputClassName("fechaAsignacion")}
              value={form.fechaAsignacion || ""}
              onChange={(event) =>
                onChange({ fechaAsignacion: event.target.value })
              }
            />
            {getFieldError("fechaAsignacion") && (
              <p className="mt-1 text-xs text-red-300">{getFieldError("fechaAsignacion")}</p>
            )}
          </div>
        </div>

        {!isEdit && (
          <p className="text-xs text-neutral-400 mt-2">
            * Obligatorios solo al crear: categoria, marca, modelo, fecha de
            compra y numero de serie.
          </p>
        )}

        {loading && (
          <div className="mt-3 rounded-xl border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-sm text-orange-200">
            Procesando solicitud. Esto puede tardar unos segundos.
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 px-4 py-2 transition hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[0_8px_22px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-5 py-2 font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 disabled:cursor-not-allowed disabled:opacity-60 ${
              hasValidationErrors && !loading
                ? "bg-red-500 ring-2 ring-red-300/60 hover:bg-red-400 hover:shadow-[0_10px_26px_rgba(239,68,68,0.45)]"
                : "bg-orange-600 ring-1 ring-orange-300/40 hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-[0_12px_28px_rgba(234,88,12,0.45)]"
            } active:translate-y-0 active:scale-[0.96]`}
            onClick={onSubmit}
            disabled={loading}
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {loading ? (
              <span className="relative inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isEdit ? "Guardando cambios..." : "Creando activo..."}
              </span>
            ) : isEdit ? (
              <span className="relative inline-flex items-center gap-2">
                Guardar cambios
              </span>
            ) : hasValidationErrors ? (
              <span className="relative inline-flex items-center gap-2">
                Revisar campos obligatorios
              </span>
            ) : (
              <span className="relative inline-flex items-center gap-2">
                Crear activo
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
