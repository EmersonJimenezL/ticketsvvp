import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Especificacion = {
  _id?: string;
  modelo: string;
  categoria?: string;
  marca?: string;
  procesador?: string;
  frecuenciaGhz?: string;
  almacenamiento?: string;
  ram?: string;
  so?: string;
  graficos?: string;
  resolucion?: string;
  createdAt?: string;
  updatedAt?: string;
};

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const API = `${BASE_URL}/api`;

export default function Modelos() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Especificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Especificacion>({ modelo: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  // Filtros
  const [fCategoria, setFCategoria] = useState<string>("");
  const [fMarca, setFMarca] = useState<string>("");
  const [fModelo, setFModelo] = useState<string>("");

  const total = useMemo(() => items.length, [items]);
  const filtered = useMemo(() => {
    const cat = fCategoria.trim().toLowerCase();
    const mar = fMarca.trim().toLowerCase();
    const mod = fModelo.trim().toLowerCase();
    return items.filter((m) => {
      const okCat = cat ? (m.categoria || "").toLowerCase() === cat : true;
      const okMarca = mar ? (m.marca || "").toLowerCase().includes(mar) : true;
      const okModelo = mod
        ? (m.modelo || "").toLowerCase().includes(mod)
        : true;
      return okCat && okMarca && okModelo;
    });
  }, [items, fCategoria, fMarca, fModelo]);
  const filteredCount = filtered.length;

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API}/especificaciones`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo cargar");
      setItems(Array.isArray(j.data) ? j.data : []);
    } catch (e: any) {
      setError(e?.message || "Error cargando modelos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function onSubmit() {
    if (!form.modelo.trim()) {
      setError("El campo 'modelo' es obligatorio");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const url = editingId
        ? `${API}/especificaciones/${editingId}`
        : `${API}/especificaciones`;
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelo: form.modelo.trim(),
          categoria: form.categoria || undefined,
          marca: form.marca || undefined,
          procesador: form.procesador || undefined,
          frecuenciaGhz: form.frecuenciaGhz || undefined,
          almacenamiento: form.almacenamiento || undefined,
          ram: form.ram || undefined,
          so: form.so || undefined,
          graficos: form.graficos || undefined,
          resolucion: form.resolucion || undefined,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo crear");
      setShowForm(false);
      setEditingId(null);
      setForm({ modelo: "" });
      await cargar();
    } catch (e: any) {
      setError(e?.message || "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id?: string) {
    if (!id) return;
    if (!confirm("¿Eliminar este modelo?")) return;
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API}/especificaciones/${id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo eliminar");
      await cargar();
    } catch (e: any) {
      setError(e?.message || "Error eliminando");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 py-10">
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

      <div className="relative mx-auto w-full">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-wrap items-start md:items-end justify-between gap-4 gap-y-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Modelos</h1>
            <p className="text-neutral-300 text-sm">
              Especificaciones técnicas por modelo. Total: {total}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5">
                {error}
              </div>
            )}
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
              type="button"
            >
              Volver
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold hover:bg-orange-500 transition"
              type="button"
            >
              Nuevo modelo
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-400">Categoría</span>
            <select
              value={fCategoria}
              onChange={(e) => setFCategoria(e.target.value)}
              className="rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Todas</option>
              {[
                "Notebook",
                "PC",
                "Monitor",
                "Tablet",
                "Celular",
                "Impresora",
                "Periférico",
                "Otro",
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-400">Marca</span>
            <input
              value={fMarca}
              onChange={(e) => setFMarca(e.target.value)}
              placeholder="Buscar marca"
              className="rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-neutral-400">Modelo</span>
            <input
              value={fModelo}
              onChange={(e) => setFModelo(e.target.value)}
              placeholder="Buscar modelo"
              className="rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            />
          </label>

          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-sm text-neutral-300">
              Mostrando {filteredCount} de {total}
            </span>
            <button
              type="button"
              onClick={() => {
                setFCategoria("");
                setFMarca("");
                setFModelo("");
              }}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          {/* Vista móvil: tarjetas */}
          <div className="block lg:hidden divide-y divide-white/10">
            {loading && (
              <div className="px-4 py-6 text-neutral-300">Cargando...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-4 py-6 text-neutral-300">
                No hay modelos cargados.
              </div>
            )}
            {filtered.map((m) => (
              <div key={m._id || m.modelo} className="p-4">
                <div className="font-semibold truncate">{m.modelo}</div>
                <ul className="mt-1 text-sm text-neutral-300 space-y-1">
                  <li>
                    <span className="text-neutral-400">Categoría:</span>{" "}
                    {m.categoria || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Marca:</span>{" "}
                    {m.marca || "-"}
                  </li>
                  <li className="truncate">
                    <span className="text-neutral-400">Procesador:</span>{" "}
                    {m.procesador || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">Frecuencia:</span>{" "}
                    {m.frecuenciaGhz || "-"}
                  </li>
                  <li className="truncate">
                    <span className="text-neutral-400">Almacenamiento:</span>{" "}
                    {m.almacenamiento || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">RAM:</span>{" "}
                    {m.ram || "-"}
                  </li>
                  <li>
                    <span className="text-neutral-400">SO:</span> {m.so || "-"}
                  </li>
                  <li className="truncate">
                    <span className="text-neutral-400">Gráficos:</span>{" "}
                    {m.graficos || "-"}
                  </li>
                  <li className="truncate">
                    <span className="text-neutral-400">Resolución:</span>{" "}
                    {m.resolucion || "-"}
                  </li>
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(m._id || null);
                      setForm({ ...m });
                      setShowForm(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-100 hover:bg-white/10 transition"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m._id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Vista escritorio: tabla */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-neutral-300">
                <tr>
                  {[
                    "Categoría",
                    "Marca",
                    "Modelo",
                    "Procesador",
                    "Frecuencia",
                    "Almacenamiento",
                    "RAM",
                    "SO",
                    "Gráficos",
                    "Resolución",
                    "Acciones",
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-neutral-300">
                      Cargando...
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-neutral-300">
                      No hay modelos cargados.
                    </td>
                  </tr>
                )}
                {filtered.map((m) => (
                  <tr key={m._id || m.modelo} className="hover:bg-white/5">
                    <td className="px-4 py-3">{m.categoria || "-"}</td>
                    <td className="px-4 py-3">{m.marca || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{m.modelo}</td>
                    <td className="px-4 py-3">{m.procesador || "-"}</td>
                    <td className="px-4 py-3">{m.frecuenciaGhz || "-"}</td>
                    <td className="px-4 py-3">{m.almacenamiento || "-"}</td>
                    <td className="px-4 py-3">{m.ram || "-"}</td>
                    <td className="px-4 py-3">{m.so || "-"}</td>
                    <td className="px-4 py-3">{m.graficos || "-"}</td>
                    <td className="px-4 py-3">{m.resolucion || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m._id || null);
                            setForm({ ...m });
                            setShowForm(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-100 hover:bg-white/10 transition"
                        >
                          ✎ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(m._id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition"
                        >
                          🗑 Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal crear */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nuevo modelo</h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">
                  Modelo <span className="text-orange-400">*</span>
                </span>
                <input
                  value={form.modelo || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modelo: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">Categoría</span>
                <select
                  value={form.categoria || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoria: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Seleccione</option>
                  {[
                    "Notebook",
                    "PC",
                    "Monitor",
                    "Tablet",
                    "Celular",
                    "Impresora",
                    "Periférico",
                    "Otro",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">Marca</span>
                <input
                  value={form.marca || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, marca: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">Procesador</span>
                <input
                  value={form.procesador || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, procesador: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">
                  Frecuencia (GHz)
                </span>
                <input
                  value={form.frecuenciaGhz || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frecuenciaGhz: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">Almacenamiento</span>
                <input
                  value={form.almacenamiento || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, almacenamiento: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">RAM</span>
                <input
                  value={form.ram || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ram: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">SO</span>
                <input
                  value={form.so || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, so: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-300">Gráficos</span>
                <input
                  value={form.graficos || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, graficos: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-sm text-neutral-300">Resolución</span>
                <input
                  value={form.resolucion || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, resolucion: e.target.value }))
                  }
                  className="w-full rounded-xl bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={onSubmit}
                disabled={loading}
                className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold hover:bg-orange-500 transition disabled:opacity-60"
              >
                {loading
                  ? "Guardando..."
                  : editingId
                  ? "Guardar cambios"
                  : "Guardar modelo"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-5 py-2 text-sm hover:bg-white/10 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
