import { useEffect, useState } from "react";
import {
  listActivos,
  createActivo,
  updateActivo,
  deleteActivo,
  assignActivo,
  getHistorico,
  type Activo,
  type CategoriaActivo,
} from "../services/activos";

// helpers de estilo (mismo look & feel de Admin)
const SHELL =
  "min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 py-10";
const CARD =
  "rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]";
const INPUT =
  "w-full rounded-xl bg-neutral-900/70 border border-white/10 text-neutral-100 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500";
const BTN =
  "rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition";
const BTN_PRI =
  "rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold hover:bg-orange-500 transition";

const CATEGORIAS: CategoriaActivo[] = [
  "computadoras",
  "impresoras",
  "celulares",
  "cuentas",
  "licencias",
];

type Filtros = {
  categoria: "" | CategoriaActivo;
  marca: string;
  usuario: string;
  sinAsignar: boolean;
  fechaCompraDesde: string;
  fechaCompraHasta: string;
  fechaAsignacionDesde: string;
  fechaAsignacionHasta: string;
};

const INIT_FILTROS: Filtros = {
  categoria: "",
  marca: "",
  usuario: "",
  sinAsignar: true,
  fechaCompraDesde: "",
  fechaCompraHasta: "",
  fechaAsignacionDesde: "",
  fechaAsignacionHasta: "",
};

type FormActivo = {
  categoria: "" | CategoriaActivo;
  marca: string;
  modelo: string;
  numeroSerie: string;
  fechaCompra: string;
  asignadoPara?: string;
  asignadoPor?: string;
  fechaAsignacion?: string;
};

const INIT_FORM: FormActivo = {
  categoria: "",
  marca: "",
  modelo: "",
  numeroSerie: "",
  fechaCompra: "",
};

export default function GestionActivos() {
  const [items, setItems] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<Filtros>(INIT_FILTROS);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormActivo>(INIT_FORM);

  const [editId, setEditId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({
    asignadoPara: "",
    asignadoPor: "",
    fechaAsignacion: "",
  });

  const [histId, setHistId] = useState<string | null>(null);
  const [historial, setHistorial] = useState<
    { nombre: string; fecha: string }[]
  >([]);
  const [histLoading, setHistLoading] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const data = await listActivos({
        categoria: filtros.categoria || undefined,
        marca: filtros.marca || undefined,
        usuario: filtros.usuario || undefined,
        sinAsignar: filtros.sinAsignar ? "true" : undefined,
        fechaCompraDesde: filtros.fechaCompraDesde || undefined,
        fechaCompraHasta: filtros.fechaCompraHasta || undefined,
        fechaAsignacionDesde: filtros.fechaAsignacionDesde || undefined,
        fechaAsignacionHasta: filtros.fechaAsignacionHasta || undefined,
      });
      setItems(data);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChangeFiltro<K extends keyof Filtros>(k: K, v: Filtros[K]) {
    setFiltros((prev) => ({ ...prev, [k]: v }));
  }

  async function aplicarFiltros() {
    await cargar();
  }

  function limpiarFiltros() {
    setFiltros(INIT_FILTROS);
    setTimeout(cargar, 0);
  }

  async function crear() {
    try {
      setLoading(true);
      if (
        !form.categoria ||
        !form.marca ||
        !form.modelo ||
        !form.numeroSerie ||
        !form.fechaCompra
      ) {
        throw new Error("Completa los campos requeridos");
      }
      const payload: any = { ...form };
      if (!payload.asignadoPara) {
        delete payload.asignadoPara;
        delete payload.asignadoPor;
        delete payload.fechaAsignacion;
      }
      const nuevo = await createActivo(payload);
      setItems((prev) => [nuevo, ...prev]);
      setShowCreate(false);
      setForm(INIT_FORM);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function guardarEdicion(id: string) {
    try {
      setLoading(true);
      const cambios: Partial<Activo> = { ...form } as any;
      const upd = await updateActivo(id, cambios);
      setItems((prev) => prev.map((i) => (i._id === id ? upd : i)));
      setEditId(null);
      setForm(INIT_FORM);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar activo?")) return;
    try {
      setLoading(true);
      await deleteActivo(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function asignar(id: string) {
    try {
      if (!assignForm.asignadoPara || !assignForm.asignadoPor) {
        alert("Completa asignado para y asignado por");
        return;
      }
      setLoading(true);
      const upd = await assignActivo(
        id,
        assignForm.asignadoPara,
        assignForm.asignadoPor,
        assignForm.fechaAsignacion || undefined
      );
      setItems((prev) => prev.map((i) => (i._id === id ? upd : i)));
      setAssignId(null);
      setAssignForm({ asignadoPara: "", asignadoPor: "", fechaAsignacion: "" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verHistorico(id: string) {
    setHistId(id);
    setHistorial([]);
    setHistLoading(true);
    try {
      const h = await getHistorico(id);
      setHistorial(h?.asignadoPara || []);
    } catch {
      // noop
    } finally {
      setHistLoading(false);
    }
  }

  return (
    <div className={SHELL}>
      {/* fondos decorativos */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #f97316 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, #ea580c 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-6xl mx-auto">
        {/* header */}
        <div className={`${CARD} mb-6 flex items-center justify-between`}>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Gestión de Activos
            </h1>
            <p className="text-neutral-300 text-sm">
              Administra dispositivos, licencias y asignaciones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5">
                {error}
              </div>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className={BTN_PRI}
              type="button"
            >
              Agregar activo
            </button>
          </div>
        </div>

        {/* filtros */}
        <div className={`${CARD} mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <select
              value={filtros.categoria}
              onChange={(e) =>
                onChangeFiltro("categoria", e.target.value as any)
              }
              className={INPUT}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              className={INPUT}
              placeholder="Marca"
              value={filtros.marca}
              onChange={(e) => onChangeFiltro("marca", e.target.value)}
            />

            <input
              className={INPUT}
              placeholder="Usuario asignado"
              value={filtros.usuario}
              onChange={(e) => onChangeFiltro("usuario", e.target.value)}
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                id="sinAsignar"
                type="checkbox"
                checked={filtros.sinAsignar}
                onChange={(e) => onChangeFiltro("sinAsignar", e.target.checked)}
              />
              <span>Sólo sin asignación</span>
            </label>

            <input
              type="date"
              className={INPUT}
              value={filtros.fechaCompraDesde}
              onChange={(e) =>
                onChangeFiltro("fechaCompraDesde", e.target.value)
              }
              title="Compra desde"
            />
            <input
              type="date"
              className={INPUT}
              value={filtros.fechaCompraHasta}
              onChange={(e) =>
                onChangeFiltro("fechaCompraHasta", e.target.value)
              }
              title="Compra hasta"
            />

            <input
              type="date"
              className={INPUT}
              value={filtros.fechaAsignacionDesde}
              onChange={(e) =>
                onChangeFiltro("fechaAsignacionDesde", e.target.value)
              }
              title="Asignación desde"
            />
            <input
              type="date"
              className={INPUT}
              value={filtros.fechaAsignacionHasta}
              onChange={(e) =>
                onChangeFiltro("fechaAsignacionHasta", e.target.value)
              }
              title="Asignación hasta"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={aplicarFiltros} className={BTN_PRI} type="button">
              Aplicar
            </button>
            <button onClick={limpiarFiltros} className={BTN} type="button">
              Limpiar
            </button>
          </div>
        </div>

        {/* tabla */}
        <div className={`${CARD} overflow-x-auto`}>
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-3 font-semibold">Categoría</th>
                <th className="text-left p-3 font-semibold">Marca</th>
                <th className="text-left p-3 font-semibold">Modelo</th>
                <th className="text-left p-3 font-semibold">N° Serie</th>
                <th className="text-left p-3 font-semibold">Asignado a</th>
                <th className="text-left p-3 font-semibold">Compra</th>
                <th className="text-left p-3 font-semibold">Asignación</th>
                <th className="text-left p-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4" colSpan={8}>
                    Cargando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="p-4" colSpan={8}>
                    Sin resultados
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr
                    key={a._id}
                    className="border-t border-white/10 hover:bg-white/10 transition"
                  >
                    <td className="p-3 capitalize">{a.categoria}</td>
                    <td className="p-3">{a.marca}</td>
                    <td className="p-3">{a.modelo}</td>
                    <td className="p-3">{a.numeroSerie}</td>
                    <td className="p-3">
                      {a.asignadoPara || (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-3">{a.fechaCompra?.slice(0, 10)}</td>
                    <td className="p-3">
                      {a.fechaAsignacion ? (
                        a.fechaAsignacion.slice(0, 10)
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={BTN}
                          onClick={() => {
                            setEditId(a._id);
                            setForm({
                              categoria: a.categoria,
                              marca: a.marca,
                              modelo: a.modelo,
                              numeroSerie: a.numeroSerie,
                              fechaCompra: a.fechaCompra?.slice(0, 10) || "",
                            });
                          }}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className={BTN_PRI}
                          onClick={() => {
                            setAssignId(a._id);
                            setAssignForm({
                              asignadoPara: a.asignadoPara || "",
                              asignadoPor: "",
                              fechaAsignacion: "",
                            });
                          }}
                          type="button"
                        >
                          {a.asignadoPara ? "Reasignar" : "Asignar"}
                        </button>
                        <button
                          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold hover:bg-rose-500 transition"
                          onClick={() => eliminar(a._id)}
                          type="button"
                        >
                          Eliminar
                        </button>
                        <button
                          className={BTN}
                          onClick={() => verHistorico(a._id)}
                          type="button"
                        >
                          Histórico
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* crear / editar */}
      {(showCreate || editId) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className={`${CARD} w-full max-w-2xl`}>
            <h2 className="text-lg font-semibold mb-4">
              {editId ? "Editar activo" : "Agregar activo"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                className={INPUT}
                value={form.categoria}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categoria: e.target.value as CategoriaActivo,
                  })
                }
              >
                <option value="">Selecciona categoría</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                className={INPUT}
                placeholder="Marca"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Modelo"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Número de serie"
                value={form.numeroSerie}
                onChange={(e) =>
                  setForm({ ...form, numeroSerie: e.target.value })
                }
              />

              <label className="text-sm">
                <span className="block mb-1">Fecha de compra</span>
                <input
                  type="date"
                  className={INPUT}
                  value={form.fechaCompra}
                  onChange={(e) =>
                    setForm({ ...form, fechaCompra: e.target.value })
                  }
                />
              </label>

              {!editId && (
                <>
                  <input
                    className={INPUT}
                    placeholder="Asignado para (opcional)"
                    value={form.asignadoPara || ""}
                    onChange={(e) =>
                      setForm({ ...form, asignadoPara: e.target.value })
                    }
                  />
                  <input
                    className={INPUT}
                    placeholder="Asignado por (opcional)"
                    value={form.asignadoPor || ""}
                    onChange={(e) =>
                      setForm({ ...form, asignadoPor: e.target.value })
                    }
                  />
                  <label className="text-sm">
                    <span className="block mb-1">
                      Fecha de asignación (opcional)
                    </span>
                    <input
                      type="date"
                      className={INPUT}
                      value={form.fechaAsignacion || ""}
                      onChange={(e) =>
                        setForm({ ...form, fechaAsignacion: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                className={BTN}
                onClick={() => {
                  setShowCreate(false);
                  setEditId(null);
                  setForm(INIT_FORM);
                }}
                type="button"
              >
                Cancelar
              </button>
              {editId ? (
                <button
                  className={BTN_PRI}
                  onClick={() => guardarEdicion(editId)}
                  type="button"
                >
                  Guardar
                </button>
              ) : (
                <button className={BTN_PRI} onClick={crear} type="button">
                  Crear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* asignar / reasignar */}
      {assignId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className={`${CARD} w-full max-w-xl`}>
            <h2 className="text-lg font-semibold mb-4">Asignar / Reasignar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className={INPUT}
                placeholder="Asignado para"
                value={assignForm.asignadoPara}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, asignadoPara: e.target.value })
                }
              />
              <input
                className={INPUT}
                placeholder="Asignado por"
                value={assignForm.asignadoPor}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, asignadoPor: e.target.value })
                }
              />
              <label className="text-sm md:col-span-2">
                <span className="block mb-1">Fecha de asignación</span>
                <input
                  type="date"
                  className={INPUT}
                  value={assignForm.fechaAsignacion}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      fechaAsignacion: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                className={BTN}
                onClick={() => {
                  setAssignId(null);
                  setAssignForm({
                    asignadoPara: "",
                    asignadoPor: "",
                    fechaAsignacion: "",
                  });
                }}
                type="button"
              >
                Cancelar
              </button>
              <button
                className={BTN_PRI}
                onClick={() => asignar(assignId)}
                type="button"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* histórico */}
      {histId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className={`${CARD} w-full max-w-xl`}>
            <h2 className="text-lg font-semibold mb-4">
              Histórico de asignaciones
            </h2>
            {histLoading ? (
              <p>Cargando...</p>
            ) : historial.length === 0 ? (
              <p className="text-sm text-neutral-300">Sin registros.</p>
            ) : (
              <ul className="space-y-2">
                {historial.map((h, idx) => (
                  <li
                    key={idx}
                    className="border border-white/10 rounded-xl p-3 flex justify-between"
                  >
                    <span>{h.nombre}</span>
                    <span className="text-neutral-400">
                      {h.fecha.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end">
              <button
                className={BTN}
                onClick={() => {
                  setHistId(null);
                  setHistorial([]);
                }}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
