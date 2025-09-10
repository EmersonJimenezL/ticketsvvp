// src/pages/GestionInventario.tsx
import { useEffect, useMemo, useState, useCallback } from "react";

/* ===== Tipos ===== */
type Activo = {
  _id?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  fechaCompra?: string; // ISO
  numeroSerie?: string;
  asignadoPara?: string;
  fechaAsignacion?: string; // ISO
  createdAt?: string;
  updatedAt?: string;
};

type Licencia = {
  _id?: string;
  cuenta?: string;
  tipoLicencia?: string;
  fechaCompra?: string; // ISO
  asignadoPara?: string;
  fechaAsignacion?: string; // ISO
  activoId?: string;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
};

const API = "/api";

/* Opciones estáticas (ajusta si ya tienes catálogo en DB) */
const OPCIONES_CATEGORIA = [
  "Notebook",
  "PC",
  "Monitor",
  "Tablet",
  "Impresora",
  "Periférico",
  "Otro",
];
const OPCIONES_TIPO_LIC = [
  "profesional",
  "CRM limitado",
  "logística",
  "acceso directo",
];

export default function GestionInventario() {
  /* ===== pestaña: activos | licencias ===== */
  const [tab, setTab] = useState<"activos" | "licencias">("activos");

  /* ===== listado ===== */
  const [activos, setActivos] = useState<Activo[]>([]);
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ===== filtros comunes ===== */
  const [soloSinAsignacion, setSoloSinAsignacion] = useState(false);

  /* Filtros activos */
  const [categoria, setCategoria] = useState("");
  const [desdeCompra, setDesdeCompra] = useState("");
  const [hastaCompra, setHastaCompra] = useState("");
  const [desdeAsign, setDesdeAsign] = useState("");
  const [hastaAsign, setHastaAsign] = useState("");

  /* Filtros licencias */
  const [cuenta, setCuenta] = useState("");
  const [tipoLicencia, setTipoLicencia] = useState("");
  const [licDesdeCompra, setLicDesdeCompra] = useState("");
  const [licHastaCompra, setLicHastaCompra] = useState("");
  const [licDesdeAsign, setLicDesdeAsign] = useState("");
  const [licHastaAsign, setLicHastaAsign] = useState("");

  /* ===== cargar datos ===== */
  const fetchActivos = useCallback(async () => {
    const params = new URLSearchParams();
    if (soloSinAsignacion) params.set("soloSinAsignacion", "1");
    if (categoria) params.set("categoria", categoria);
    if (desdeCompra) params.set("desdeCompra", desdeCompra);
    if (hastaCompra) params.set("hastaCompra", hastaCompra);
    if (desdeAsign) params.set("desdeAsign", desdeAsign);
    if (hastaAsign) params.set("hastaAsign", hastaAsign);
    const r = await fetch(`${API}/activos?${params.toString()}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Error al listar activos");
    setActivos(j.data);
  }, [
    soloSinAsignacion,
    categoria,
    desdeCompra,
    hastaCompra,
    desdeAsign,
    hastaAsign,
  ]);

  // Versión unificada: trae licencias reales y también las que están
  // guardadas como activos con categoria=licencias, y las normaliza.
  const fetchLicenciasMerged = useCallback(async () => {
    const params = new URLSearchParams();
    if (cuenta) params.set("cuenta", cuenta);
    if (tipoLicencia) params.set("tipoLicencia", tipoLicencia);
    if (licDesdeCompra) params.set("desdeCompra", licDesdeCompra);
    if (licHastaCompra) params.set("hastaCompra", licHastaCompra);

    const activosLicParams = new URLSearchParams();
    activosLicParams.set("categoria", "licencias");

    const [rLic, rActLic] = await Promise.all([
      fetch(`${API}/licencias?${params.toString()}`).catch(() => null),
      fetch(`${API}/activos?${activosLicParams.toString()}`).catch(() => null),
    ]);

    const list: Licencia[] = [];
    try {
      if (rLic) {
        const j = await rLic.json();
        if (j?.ok && Array.isArray(j.data)) list.push(...j.data);
      }
    } catch {}

    try {
      if (rActLic) {
        const j2 = await rActLic.json();
        if (j2?.ok && Array.isArray(j2.data)) {
          const mapped: Licencia[] = j2.data.map((a: any) => {
            const est = a?.licencia?.estado;
            const disponibleBool = est ? est !== "asignada" : true;
            return {
              _id: a?._id,
              cuenta: a?.licencia?.cuenta,
              tipoLicencia: a?.licencia?.tipoLicencia,
              fechaCompra: a?.fechaCompra,
              asignadoPara: a?.licencia?.usuarioNombre || a?.asignadoPara,
              fechaAsignacion:
                a?.licencia?.asignadaEn || a?.fechaAsignacion || undefined,
              activoId: a?._id,
              notas: a?.notas,
              createdAt: a?.createdAt,
              updatedAt: a?.updatedAt,
            } as Licencia;
          });
          list.push(...mapped);
        }
      }
    } catch {}

    setLicencias(list);
  }, [cuenta, tipoLicencia, licDesdeCompra, licHastaCompra]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (tab === "activos") await fetchActivos();
      else await fetchLicenciasMerged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, fetchActivos, fetchLicenciasMerged]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /* ===== crear/editar activos (mismo flujo que tenías) ===== */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Activo>({
    categoria: "",
    marca: "",
    modelo: "",
    fechaCompra: "",
    numeroSerie: "",
    asignadoPara: "",
    fechaAsignacion: "",
  });

  function openCreate() {
    setEditId(null);
    setForm({
      categoria: "",
      marca: "",
      modelo: "",
      fechaCompra: "",
      numeroSerie: "",
      asignadoPara: "",
      fechaAsignacion: "",
    });
    setShowForm(true);
  }
  function openEdit(a: Activo) {
    setEditId(a._id || null);
    setForm({
      categoria: a.categoria || "",
      marca: a.marca || "",
      modelo: a.modelo || "",
      fechaCompra: (a.fechaCompra || "").slice(0, 10),
      numeroSerie: a.numeroSerie || "",
      asignadoPara: (a as any).asignadoPara || "",
      fechaAsignacion: (a.fechaAsignacion || "").slice(0, 10),
    });
    setShowForm(true);
  }
  async function submitForm() {
    try {
      setLoading(true);
      setError(null);
      const payload: any = {
        categoria: form.categoria,
        marca: form.marca,
        modelo: form.modelo,
        fechaCompra: form.fechaCompra,
        numeroSerie: form.numeroSerie,
        asignadoPara: form.asignadoPara,
        fechaAsignacion: form.fechaAsignacion,
      };
      if (!payload.fechaCompra) delete payload.fechaCompra;
      if (!payload.fechaAsignacion) delete payload.fechaAsignacion;

      const method = editId ? "PATCH" : "POST";
      const url = editId ? `${API}/activos/${editId}` : `${API}/activos`;
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error al guardar");
      setShowForm(false);
      await fetchActivos();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ===== helpers ===== */
  function limpiarFiltros() {
    if (tab === "activos") {
      setSoloSinAsignacion(false);
      setCategoria("");
      setDesdeCompra("");
      setHastaCompra("");
      setDesdeAsign("");
      setHastaAsign("");
    } else {
      setCuenta("");
      setTipoLicencia("");
      setLicDesdeCompra("");
      setLicHastaCompra("");
      setLicDesdeAsign("");
      setLicHastaAsign("");
    }
  }

  // Asegurar separación: no mostrar en Activos los documentos con categoría "licencias"
  // ni los que traigan un objeto `licencia` incrustado.
  const activosSolo = useMemo(
    () =>
      activos.filter((a: any) => {
        const cat = (a?.categoria || "").toString().toLowerCase();
        if (cat === "licencias") return false;
        if ("licencia" in a && a.licencia) return false;
        return true;
      }),
    [activos]
  );

  const total = useMemo(
    () => (tab === "activos" ? activosSolo.length : licencias.length),
    [tab, activosSolo, licencias]
  );

  /* ===== Historial (activos/licencias) ===== */
  const [showHist, setShowHist] = useState(false);
  const [histTitle, setHistTitle] = useState<string>("");
  const [histMovs, setHistMovs] = useState<
    {
      usuario?: string;
      accion?: string;
      fecha?: string;
      observacion?: string;
      por?: string;
      desde?: string;
      hasta?: string;
    }[]
  >([]);
  async function openHistorial(
    tipo: "activo" | "licencia",
    id: string,
    titulo: string
  ) {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API}/historicos/${tipo}/${id}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo obtener historial");
      setHistTitle(titulo);
      setHistMovs(j?.data?.movimientos || []);
      setShowHist(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ===== Crear/editar licencias ===== */
  const [showLicForm, setShowLicForm] = useState(false);
  const [editLicId, setEditLicId] = useState<string | null>(null);
  const [licForm, setLicForm] = useState<Licencia>({
    cuenta: "",
    tipoLicencia: "",
    fechaCompra: "",
    asignadoPara: "",
    fechaAsignacion: "",
  });
  function openCreateLic() {
    setEditLicId(null);
    setLicForm({
      cuenta: "",
      tipoLicencia: "",
      fechaCompra: "",
      asignadoPara: "",
      fechaAsignacion: "",
    });
    setShowLicForm(true);
  }
  function openEditLic(l: Licencia) {
    if (l.activoId) return; // filas mapeadas desde activos: no editable aquí
    setEditLicId(l._id || null);
    setLicForm({
      cuenta: l.cuenta || "",
      tipoLicencia: l.tipoLicencia || "",
      fechaCompra: (l.fechaCompra || "").slice(0, 10),
      asignadoPara: l.asignadoPara || "",
      fechaAsignacion: (l.fechaAsignacion || "").slice(0, 10),
      _id: l._id,
    });
    setShowLicForm(true);
  }
  async function submitLicForm() {
    try {
      setLoading(true);
      setError(null);
      const payload: any = {
        cuenta: licForm.cuenta,
        tipoLicencia: licForm.tipoLicencia,
        fechaCompra: licForm.fechaCompra,
        asignadoPara: licForm.asignadoPara,
        fechaAsignacion: licForm.fechaAsignacion,
      };
      if (!payload.fechaCompra) delete payload.fechaCompra;
      if (!payload.fechaAsignacion) delete payload.fechaAsignacion;
      const method = editLicId ? "PATCH" : "POST";
      const url = editLicId
        ? `${API}/licencias/${editLicId}`
        : `${API}/licencias`;
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error al guardar licencia");
      setShowLicForm(false);
      await fetchLicenciasMerged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ===== Asignar / Reasignar / Desasignar ===== */
  const [showAssign, setShowAssign] = useState(false);
  const [assignCtx, setAssignCtx] = useState<{
    tipo: "activo" | "licencia";
    id: string;
    titulo: string;
    asignadoPara: string;
    fechaAsignacion: string;
  } | null>(null);

  function openAssign(
    tipo: "activo" | "licencia",
    id: string,
    titulo: string,
    currentUser: string,
    currentDate?: string
  ) {
    setAssignCtx({
      tipo,
      id,
      titulo,
      asignadoPara: currentUser || "",
      fechaAsignacion: (currentDate || "").slice(0, 10),
    });
    setShowAssign(true);
  }

  async function submitAssign() {
    if (!assignCtx) return;
    try {
      setLoading(true);
      setError(null);
      const url =
        assignCtx.tipo === "activo"
          ? `${API}/activos/${assignCtx.id}`
          : `${API}/licencias/${assignCtx.id}`;
      const payload: any = {
        asignadoPara: assignCtx.asignadoPara,
        fechaAsignacion: assignCtx.fechaAsignacion,
      };
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo asignar");
      setShowAssign(false);
      if (assignCtx.tipo === "activo") await fetchActivos();
      else await fetchLicenciasMerged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function desasignar(tipo: "activo" | "licencia", id: string) {
    try {
      setLoading(true);
      setError(null);
      const url =
        tipo === "activo" ? `${API}/activos/${id}` : `${API}/licencias/${id}`;
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignadoPara: "", fechaAsignacion: "" }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo desasignar");
      if (tipo === "activo") await fetchActivos();
      else await fetchLicenciasMerged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ===== Eliminar ===== */
  const [showDelete, setShowDelete] = useState(false);
  const [deleteCtx, setDeleteCtx] = useState<{
    tipo: "activo" | "licencia";
    id: string;
    titulo: string;
  } | null>(null);

  function openDelete(tipo: "activo" | "licencia", id: string, titulo: string) {
    setDeleteCtx({ tipo, id, titulo });
    setShowDelete(true);
  }

  async function submitDelete() {
    if (!deleteCtx) return;
    try {
      setLoading(true);
      setError(null);
      const url =
        deleteCtx.tipo === "activo"
          ? `${API}/activos/${deleteCtx.id}`
          : `${API}/licencias/${deleteCtx.id}`;
      const r = await fetch(url, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "No se pudo eliminar");
      setShowDelete(false);
      if (deleteCtx.tipo === "activo") await fetchActivos();
      else await fetchLicenciasMerged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ===== Render ===== */
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 py-10">
      {/* fondos decorativos (igual que tus páginas) */}
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

      <div className="relative mx-auto max-w-screen-2xl">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Inventario
            </h1>
            <p className="text-neutral-300 text-sm">
              Activos y licencias con sus asignaciones.
            </p>
          </div>
          <div className="flex gap-2">
            {tab === "activos" && (
              <button
                onClick={openCreate}
                className="rounded-xl bg-orange-600 px-4 py-2 font-semibold transition hover:bg-orange-500"
              >
                Crear activo
              </button>
            )}
            {tab === "licencias" && (
              <button
                onClick={openCreateLic}
                className="rounded-xl bg-orange-600 px-4 py-2 font-semibold transition hover:bg-orange-500"
              >
                Crear licencia
              </button>
            )}
            <button
              onClick={cargar}
              className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
              type="button"
              disabled={loading}
            >
              Recargar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              className={`px-4 py-2 rounded-lg transition ${
                tab === "activos"
                  ? "bg-neutral-900/70 text-neutral-100"
                  : "hover:bg-white/10 text-neutral-300"
              }`}
              onClick={() => setTab("activos")}
            >
              Activos
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition ${
                tab === "licencias"
                  ? "bg-neutral-900/70 text-neutral-100"
                  : "hover:bg-white/10 text-neutral-300"
              }`}
              onClick={() => setTab("licencias")}
            >
              Licencias
            </button>
          </div>
        </div>

        {/* Layout 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Filtros izquierda */}
          <aside className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md lg:sticky lg:top-4 self-start">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <span className="text-sm text-neutral-300">{total} items</span>
            </div>

            {tab === "activos" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-neutral-300">
                    Categoría
                  </label>
                  <select
                    className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {OPCIONES_CATEGORIA.map((c) => (
                      <option key={c} value={c}>
                        {c}
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
                      value={desdeCompra}
                      onChange={(e) => setDesdeCompra(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-300">
                      Comprado el (hasta)
                    </label>
                    <input
                      type="date"
                      value={hastaCompra}
                      onChange={(e) => setHastaCompra(e.target.value)}
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
                      value={desdeAsign}
                      onChange={(e) => setDesdeAsign(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-300">
                      Asignado el (hasta)
                    </label>
                    <input
                      type="date"
                      value={hastaAsign}
                      onChange={(e) => setHastaAsign(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-neutral-300">
                  <input
                    type="checkbox"
                    checked={soloSinAsignacion}
                    onChange={(e) => setSoloSinAsignacion(e.target.checked)}
                  />
                  <span>Solo sin asignación</span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={fetchActivos}
                    className="rounded-xl bg-orange-600 px-4 py-2 font-semibold transition hover:bg-orange-500"
                    disabled={loading}
                  >
                    Aplicar
                  </button>
                  <button
                    onClick={limpiarFiltros}
                    className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                    disabled={loading}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-neutral-300">
                    Cuenta
                  </label>
                  <input
                    className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    value={cuenta}
                    onChange={(e) => setCuenta(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-300">
                    Tipo licencia
                  </label>
                  <select
                    className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    value={tipoLicencia}
                    onChange={(e) => setTipoLicencia(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {OPCIONES_TIPO_LIC.map((t) => (
                      <option key={t} value={t}>
                        {t}
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
                      value={licDesdeCompra}
                      onChange={(e) => setLicDesdeCompra(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-300">
                      Comprado el (hasta)
                    </label>
                    <input
                      type="date"
                      value={licHastaCompra}
                      onChange={(e) => setLicHastaCompra(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Rango de asignación local (no filtra en server; útil para ordenar/filtrar client-side si luego quieres) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-300">
                      Asignado el (desde)
                    </label>
                    <input
                      type="date"
                      value={licDesdeAsign}
                      onChange={(e) => setLicDesdeAsign(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-300">
                      Asignado el (hasta)
                    </label>
                    <input
                      type="date"
                      value={licHastaAsign}
                      onChange={(e) => setLicHastaAsign(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={fetchLicenciasMerged}
                    className="rounded-xl bg-orange-600 px-4 py-2 font-semibold transition hover:bg-orange-500"
                    disabled={loading}
                  >
                    Aplicar
                  </button>
                  <button
                    onClick={limpiarFiltros}
                    className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                    disabled={loading}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* Tabla derecha */}
          <section className="lg:col-span-9 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-0 backdrop-blur-md overflow-hidden">
              <div className="max-h-[70vh] overflow-auto">
                {tab === "activos" ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-900/70 sticky top-0 z-10 backdrop-blur">
                      <tr>
                        <th className="text-left px-4 py-3">Categoría</th>
                        <th className="text-left px-4 py-3">Marca</th>
                        <th className="text-left px-4 py-3">Modelo</th>
                        <th className="text-left px-4 py-3">Serie</th>
                        <th className="text-left px-4 py-3">Compra</th>
                        <th className="text-left px-4 py-3">Asignado a</th>
                        <th className="text-left px-4 py-3">Asignación</th>
                        <th className="text-left px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activosSolo.map((a) => (
                        <tr
                          key={a._id}
                          className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors"
                        >
                          <td className="px-4 py-2 whitespace-nowrap">
                            {a.categoria || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {a.marca || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {a.modelo || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {a.numeroSerie || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {a.fechaCompra
                              ? new Date(a.fechaCompra).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {a.asignadoPara || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {a.fechaAsignacion
                              ? new Date(a.fechaAsignacion).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition"
                                onClick={() => openEdit(a)}
                              >
                                Editar
                              </button>
                              <button
                                className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition"
                                onClick={() =>
                                  openAssign(
                                    "activo",
                                    String(a._id || ""),
                                    `${a.marca || ""} ${
                                      a.modelo || ""
                                    }`.trim() || "Activo",
                                    a.asignadoPara || "",
                                    a.fechaAsignacion || ""
                                  )
                                }
                              >
                                {a.asignadoPara ? "Reasignar" : "Asignar"}
                              </button>
                              {a.asignadoPara && (
                                <button
                                  className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition"
                                  onClick={() =>
                                    desasignar("activo", String(a._id || ""))
                                  }
                                >
                                  Desasignar
                                </button>
                              )}
                              <button
                                className="rounded-lg border border-red-500/40 px-3 py-1 hover:bg-red-500/20 transition"
                                onClick={() =>
                                  openDelete(
                                    "activo",
                                    String(a._id || ""),
                                    `${a.marca || ""} ${
                                      a.modelo || ""
                                    }`.trim() || "Activo"
                                  )
                                }
                              >
                                Eliminar
                              </button>
                              <button
                                className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition"
                                onClick={() =>
                                  openHistorial(
                                    "activo",
                                    String(a._id || ""),
                                    `${a.marca || ""} ${
                                      a.modelo || ""
                                    }`.trim() || "Activo"
                                  )
                                }
                              >
                                Historial
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {activos.length === 0 && !loading && (
                        <tr>
                          <td
                            className="px-4 py-6 text-center text-neutral-300"
                            colSpan={8}
                          >
                            Sin resultados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-900/70 sticky top-0 z-10 backdrop-blur">
                      <tr>
                        <th className="text-left px-4 py-3">Cuenta</th>
                        <th className="text-left px-4 py-3">Tipo licencia</th>
                        <th className="text-left px-4 py-3">Compra</th>
                        <th className="text-left px-4 py-3">Asignado a</th>
                        <th className="text-left px-4 py-3">Asignación</th>
                        <th className="text-left px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licencias
                        .filter((l) => {
                          // filtro client-side por rango de asignación (opcional)
                          if (
                            licDesdeAsign &&
                            (!l.fechaAsignacion ||
                              l.fechaAsignacion < licDesdeAsign)
                          )
                            return false;
                          if (
                            licHastaAsign &&
                            (!l.fechaAsignacion ||
                              l.fechaAsignacion > licHastaAsign)
                          )
                            return false;
                          return true;
                        })
                        .map((l) => (
                          <tr
                            key={l._id}
                            className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors"
                          >
                            <td className="px-4 py-2 whitespace-nowrap">
                              {l.cuenta || "-"}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {l.tipoLicencia || "-"}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {l.fechaCompra
                                ? new Date(l.fechaCompra).toLocaleDateString()
                                : "—"}
                            </td>

                            <td className="px-4 py-2 whitespace-nowrap">
                              {l.asignadoPara || "-"}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {l.fechaAsignacion
                                ? new Date(
                                    l.fechaAsignacion
                                  ).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex flex-wrap items-center gap-2">
                                {!l.activoId && (
                                  <>
                                    <button
                                      className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition"
                                      onClick={() => openEditLic(l)}
                                    >
                                      Editar
                                    </button>
                                    <button
                                      className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition"
                                      onClick={() =>
                                        openAssign(
                                          "licencia",
                                          String(l._id || ""),
                                          l.tipoLicencia || "Licencia",
                                          l.asignadoPara || "",
                                          l.fechaAsignacion || ""
                                        )
                                      }
                                    >
                                      {l.asignadoPara ? "Reasignar" : "Asignar"}
                                    </button>
                                    {l.asignadoPara && (
                                      <button
                                        className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition"
                                        onClick={() =>
                                          desasignar(
                                            "licencia",
                                            String(l._id || "")
                                          )
                                        }
                                      >
                                        Desasignar
                                      </button>
                                    )}
                                    <button
                                      className="rounded-lg border border-red-500/40 px-3 py-1 hover:bg-red-500/20 transition"
                                      onClick={() =>
                                        openDelete(
                                          "licencia",
                                          String(l._id || ""),
                                          l.tipoLicencia || "Licencia"
                                        )
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  </>
                                )}
                                <button
                                  className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/10 transition"
                                  onClick={() =>
                                    openHistorial(
                                      l.activoId ? "activo" : "licencia",
                                      String(l.activoId || l._id || ""),
                                      l.tipoLicencia || "Licencia"
                                    )
                                  }
                                >
                                  Historial
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {licencias.length === 0 && !loading && (
                        <tr>
                          <td
                            className="px-4 py-6 text-center text-neutral-300"
                            colSpan={6}
                          >
                            Sin resultados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {loading && (
                <div className="px-4 py-3 text-neutral-300 border-t border-white/10">
                  Cargando…
                </div>
              )}
              {error && (
                <div className="px-4 py-3 text-red-300 border-t border-red-500/30 bg-red-500/10">
                  {error}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Modal Activo (crear/editar) */}
      {showForm && tab === "activos" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editId
                  ? "Editar activo (nada obligatorio al editar)"
                  : "Crear activo (obligatorios)"}
              </h3>
              <button
                className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                onClick={() => setShowForm(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-neutral-300">
                  Categoría{" "}
                  {!editId && <span className="text-orange-400">*</span>}
                </label>
                <select
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={form.categoria || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoria: e.target.value }))
                  }
                >
                  <option value="">Seleccione</option>
                  {OPCIONES_CATEGORIA.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Marca {!editId && <span className="text-orange-400">*</span>}
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={form.marca || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, marca: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Modelo {!editId && <span className="text-orange-400">*</span>}
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={form.modelo || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modelo: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Fecha de compra{" "}
                  {!editId && <span className="text-orange-400">*</span>}
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={form.fechaCompra || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fechaCompra: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Número de serie{" "}
                  {!editId && <span className="text-orange-400">*</span>}
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={form.numeroSerie || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, numeroSerie: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Asignado a
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={form.asignadoPara || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, asignadoPara: e.target.value }))
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fechaAsignacion: e.target.value }))
                  }
                />
              </div>

              {/* Campos adicionales ocultados a pedido: ubicación y notas */}
            </div>

            {!editId && (
              <p className="text-xs text-neutral-400 mt-2">
                * Obligatorios solo al crear: categoría, marca, modelo, fecha de
                compra y número de serie.
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-orange-600 px-5 py-2 font-semibold transition hover:bg-orange-500 disabled:opacity-60"
                onClick={submitForm}
                disabled={loading}
              >
                {editId ? "Guardar cambios" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Licencia (crear/editar) */}
      {showLicForm && tab === "licencias" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editLicId ? "Editar licencia" : "Crear licencia"}
              </h3>
              <button
                className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                onClick={() => setShowLicForm(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-neutral-300">
                  Cuenta *
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={licForm.cuenta || ""}
                  onChange={(e) =>
                    setLicForm((f) => ({ ...f, cuenta: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300">
                  Tipo licencia *
                </label>
                <select
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={licForm.tipoLicencia || ""}
                  onChange={(e) =>
                    setLicForm((f) => ({ ...f, tipoLicencia: e.target.value }))
                  }
                >
                  <option value="">Seleccione</option>
                  {OPCIONES_TIPO_LIC.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
                  value={licForm.fechaCompra || ""}
                  onChange={(e) =>
                    setLicForm((f) => ({ ...f, fechaCompra: e.target.value }))
                  }
                />
              </div>
              {/* Disponible ya no aplica en el nuevo modelo */}
              <div>
                <label className="block text-sm text-neutral-300">
                  Asignado a
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={licForm.asignadoPara || ""}
                  onChange={(e) =>
                    setLicForm((f) => ({ ...f, asignadoPara: e.target.value }))
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
                  value={licForm.fechaAsignacion || ""}
                  onChange={(e) =>
                    setLicForm((f) => ({
                      ...f,
                      fechaAsignacion: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                onClick={() => setShowLicForm(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-orange-600 px-5 py-2 font-semibold transition hover:bg-orange-500 disabled:opacity-60"
                onClick={submitLicForm}
                disabled={loading}
              >
                {editLicId ? "Guardar cambios" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar/Reasignar */}
      {showAssign && assignCtx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {assignCtx.asignadoPara ? "Reasignar" : "Asignar"}{" "}
                {assignCtx.titulo}
              </h3>
              <button
                className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                onClick={() => setShowAssign(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-neutral-300">
                  Asignado a
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={assignCtx.asignadoPara}
                  onChange={(e) =>
                    setAssignCtx((s) =>
                      s ? { ...s, asignadoPara: e.target.value } : s
                    )
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
                  value={assignCtx.fechaAsignacion}
                  onChange={(e) =>
                    setAssignCtx((s) =>
                      s ? { ...s, fechaAsignacion: e.target.value } : s
                    )
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                onClick={() => setShowAssign(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-orange-600 px-5 py-2 font-semibold transition hover:bg-orange-500 disabled:opacity-60"
                onClick={submitAssign}
                disabled={loading}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDelete && deleteCtx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Confirmar eliminación</h3>
              <p className="text-sm text-neutral-300 mt-1">
                ¿Eliminar {deleteCtx.titulo}? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                onClick={() => setShowDelete(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-red-600 px-5 py-2 font-semibold transition hover:bg-red-500 disabled:opacity-60"
                onClick={submitDelete}
                disabled={loading}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {showHist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Historial: {histTitle}</h3>
              <button
                className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                onClick={() => setShowHist(false)}
              >
                Cerrar
              </button>
            </div>
            {histMovs.length === 0 ? (
              <div className="text-neutral-300">Sin movimientos.</div>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-auto">
                {histMovs
                  .slice()
                  .reverse()
                  .map((m, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-white/10 p-3 bg-white/5"
                    >
                      <div className="text-sm">
                        <span className="font-medium">{m.accion}</span> por{" "}
                        <span className="font-medium">{m.usuario || "-"}</span>
                      </div>
                      <div className="text-xs text-neutral-300">
                        {m.fecha
                          ? new Date(m.fecha).toLocaleString()
                          : "sin fecha"}
                        {m.desde || m.hasta ? (
                          <>
                            {" "}
                            - {m.desde || ""} → {m.hasta || ""}
                          </>
                        ) : null}
                      </div>
                      {m.observacion && (
                        <div className="text-xs text-neutral-400 mt-1">
                          {m.observacion}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
