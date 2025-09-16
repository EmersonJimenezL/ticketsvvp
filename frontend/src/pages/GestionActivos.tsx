// src/pages/GestionInventario.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/* ===== Tipos ===== */
type Activo = {
  _id?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  fechaCompra?: string; // ISO
  numeroSerie?: string;
  sucursal?: string;
  asignadoPara?: string;
  fechaAsignacion?: string; // ISO
  createdAt?: string;
  updatedAt?: string;
};

type Licencia = {
  _id?: string;
  proveedor?: "SAP" | "Office";
  cuenta?: string;
  tipoLicencia?: string;
  fechaCompra?: string; // ISO
  sucursal?: string;
  asignadoPara?: string;
  fechaAsignacion?: string; // ISO
  activoId?: string;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
};

const API = "/api";

type LicenciaStats = {
  total: number;
  disponibles: number;
  ocupadas: number;
  porTipo: Record<string, number>;
  porProveedor: Record<string, number>;
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE = 25;

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
};

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
// Tipos de licencias por proveedor
const OPCIONES_TIPO_LIC_MAP = {
  SAP: [
    "Profesional",
    "CRM limitada",
    "Logistica limitada",
    "Acceso indirecto",
    "Financiera limitada",
  ],
  Office: [
    "Microsoft 365 E3",
    "Microsoft 365 Empresa Basico",
    "Microsoft 365 Empresa Estandar",
  ],
} as const;

// Proveedores disponibles para licencias
const OPCIONES_PROVEEDOR = ["SAP", "Office"] as const;

export default function GestionInventario() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  /* ===== pestaña: activos | licencias ===== */
  const [tab, setTab] = useState<"activos" | "licencias" | "estadisticas">(
    "activos"
  );

  /* ===== listado ===== */
  const [activos, setActivos] = useState<Activo[]>([]);
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specs, setSpecs] = useState<Especificacion[]>([]);

  const [visibleActivos, setVisibleActivos] = useState(PAGE_SIZE);
  const [visibleLicencias, setVisibleLicencias] = useState(PAGE_SIZE);
  const [licStats, setLicStats] = useState<LicenciaStats | null>(null);

  /* ===== filtros comunes ===== */
  const [soloSinAsignacion, setSoloSinAsignacion] = useState(false);

  /* Filtros activos */
  const [categoria, setCategoria] = useState("");
  const [desdeCompra, setDesdeCompra] = useState("");
  const [hastaCompra, setHastaCompra] = useState("");
  const [desdeAsign, setDesdeAsign] = useState("");
  const [hastaAsign, setHastaAsign] = useState("");
  const [sucursalAct, setSucursalAct] = useState("");

  /* Filtros licencias */
  const [cuenta, setCuenta] = useState("");
  const [licProveedor, setLicProveedor] = useState("");
  const [tipoLicencia, setTipoLicencia] = useState("");
  const [licAsignadoPara, setLicAsignadoPara] = useState("");
  const [licDesdeCompra, setLicDesdeCompra] = useState("");
  const [licHastaCompra, setLicHastaCompra] = useState("");
  const [licDesdeAsign, setLicDesdeAsign] = useState("");
  const [licHastaAsign, setLicHastaAsign] = useState("");
  const [licSucursal, setLicSucursal] = useState("");

  const debouncedCuenta = useDebouncedValue(cuenta, 300);
  const debouncedAsignado = useDebouncedValue(licAsignadoPara, 300);

  // Tipos de licencia disponibles en filtros según proveedor seleccionado
  const tiposLicenciasFiltro = useMemo(() => {
    if (licProveedor === "SAP") return [...OPCIONES_TIPO_LIC_MAP.SAP];
    if (licProveedor === "Office") return [...OPCIONES_TIPO_LIC_MAP.Office];
    return [...OPCIONES_TIPO_LIC_MAP.SAP, ...OPCIONES_TIPO_LIC_MAP.Office];
  }, [licProveedor]);

  /* ===== cargar datos ===== */
  const fetchActivos = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", "500");
    if (soloSinAsignacion) params.set("soloSinAsignacion", "1");
    if (categoria) params.set("categoria", categoria);
    if (sucursalAct) params.set("sucursal", sucursalAct);
    if (desdeCompra) params.set("desdeCompra", desdeCompra);
    if (hastaCompra) params.set("hastaCompra", hastaCompra);
    if (desdeAsign) params.set("desdeAsign", desdeAsign);
    if (hastaAsign) params.set("hastaAsign", hastaAsign);
    const r = await fetch(`${API}/activos?${params.toString()}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Error al listar activos");
    setActivos(j.data);
    setVisibleActivos(PAGE_SIZE);
  }, [
    soloSinAsignacion,
    categoria,
    desdeCompra,
    hastaCompra,
    desdeAsign,
    hastaAsign,
    sucursalAct,
  ]);

  // Versión unificada: trae licencias reales y también las que están
  // guardadas como activos con categoria=licencias, y las normaliza.
  const fetchEspecificaciones = useCallback(async () => {
    try {
      const r = await fetch(`${API}/especificaciones`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error al listar especificaciones");
      setSpecs(Array.isArray(j.data) ? j.data : []);
    } catch (_) {
      setSpecs([]);
    }
  }, []);

  const fetchLicenciasMerged = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", "500");
    if (debouncedCuenta) params.set("cuenta", debouncedCuenta);
    if (licProveedor) params.set("proveedor", licProveedor);
    if (tipoLicencia) params.set("tipoLicencia", tipoLicencia);
    if (debouncedAsignado) params.set("asignadoPara", debouncedAsignado);
    if (licDesdeCompra) params.set("desdeCompra", licDesdeCompra);
    if (licHastaCompra) params.set("hastaCompra", licHastaCompra);
    if (licSucursal) params.set("sucursal", licSucursal);

    const activosLicParams = new URLSearchParams();
    activosLicParams.set("categoria", "licencias");
    activosLicParams.set("limit", "500");
    if (licSucursal) activosLicParams.set("sucursal", licSucursal);

    const [rLic, rActLic] = await Promise.all([
      fetch(`${API}/licencias?${params.toString()}`).catch(() => null),
      fetch(`${API}/activos?${activosLicParams.toString()}`).catch(() => null),
    ]);

    let list: Licencia[] = [];
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
            // const est = a?.licencia?.estado;
            // const disponibleBool = est ? est !== "asignada" : true;
            return {
              _id: a?._id,
              proveedor: a?.licencia?.proveedor,
              cuenta: a?.licencia?.cuenta,
              tipoLicencia: a?.licencia?.tipoLicencia,
              fechaCompra: a?.fechaCompra,
              sucursal: a?.sucursal,
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

    // Filtro por asignado (cliente) para cubrir las filas que vienen desde activos
    if (debouncedAsignado) {
      const needle = debouncedAsignado.toLowerCase();
      list = list.filter((l) =>
        (l.asignadoPara || "").toLowerCase().includes(needle)
      );
    }

    if (debouncedCuenta) {
      const cuentaNeedle = debouncedCuenta.toLowerCase();
      list = list.filter((l) =>
        (l.cuenta || "").toLowerCase().includes(cuentaNeedle)
      );
    }

    if (licDesdeCompra) {
      list = list.filter(
        (l) => (l.fechaCompra || "").slice(0, 10) >= licDesdeCompra
      );
    }

    if (licHastaCompra) {
      list = list.filter(
        (l) => (l.fechaCompra || "").slice(0, 10) <= licHastaCompra
      );
    }

    if (licSucursal) {
      const sucursalNeedle = licSucursal.toLowerCase();
      list = list.filter((l) =>
        (l.sucursal || "").toLowerCase().includes(sucursalNeedle)
      );
    }

    // Filtro por proveedor (aplica también a las filas mapeadas desde activos)
    if (licProveedor) {
      const p = licProveedor.toLowerCase();
      list = list.filter((l) => (l.proveedor || "").toLowerCase() === p);
    }

    setLicencias(list);
    setVisibleLicencias(PAGE_SIZE);
  }, [
    debouncedCuenta,
    licProveedor,
    tipoLicencia,
    debouncedAsignado,
    licDesdeCompra,
    licHastaCompra,
    licSucursal,
  ]);

  const fetchLicStats = useCallback(async () => {
    const r = await fetch(`${API}/licencias/stats`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Error al obtener estadisticas");
    setLicStats(j.data || null);
  }, []);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (tab === "activos") await fetchActivos();
      else if (tab === "licencias") await fetchLicenciasMerged();
      else await fetchLicStats();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, fetchActivos, fetchLicenciasMerged, fetchLicStats]);

  useEffect(() => {
    cargar();
    fetchEspecificaciones();
  }, [cargar, fetchEspecificaciones]);

  useEffect(() => {
    setVisibleActivos(PAGE_SIZE);
  }, [activos]);

  useEffect(() => {
    setVisibleLicencias(PAGE_SIZE);
  }, [licencias, licDesdeAsign, licHastaAsign, licSucursal]);

  /* ===== crear/editar activos (mismo flujo que tenías) ===== */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Activo>({
    categoria: "",
    marca: "",
    modelo: "",
    fechaCompra: "",
    numeroSerie: "",
    sucursal: "",
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
      sucursal: "",
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
      sucursal: (a as any).sucursal || "",
      asignadoPara: (a as any).asignadoPara || "",
      fechaAsignacion: (a.fechaAsignacion || "").slice(0, 10),
    });
    setShowForm(true);
  }
  async function submitForm() {
    try {
      setLoading(true);
      setError(null);
      if (!editId && !form.modelo) {
        throw new Error(
          "Debes seleccionar un modelo existente en especificaciones."
        );
      }
      const payload: any = {
        categoria: form.categoria,
        marca: form.marca,
        modelo: form.modelo,
        fechaCompra: form.fechaCompra,
        numeroSerie: form.numeroSerie,
        sucursal: form.sucursal,
        asignadoPara: form.asignadoPara,
        fechaAsignacion: form.fechaAsignacion,
      };
      if (!payload.fechaCompra) delete payload.fechaCompra;
      if (!payload.fechaAsignacion) delete payload.fechaAsignacion;
      if (!payload.sucursal) delete payload.sucursal;

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
      setSucursalAct("");
    } else {
      setCuenta("");
      setLicProveedor("");
      setTipoLicencia("");
      setLicAsignadoPara("");
      setLicDesdeCompra("");
      setLicHastaCompra("");
      setLicDesdeAsign("");
      setLicHastaAsign("");
      setLicSucursal("");
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

  const activosToRender = useMemo(
    () => activosSolo.slice(0, visibleActivos),
    [activosSolo, visibleActivos]
  );

  const licenciasFiltradas = useMemo(
    () =>
      licencias.filter((l) => {
        if (
          licDesdeAsign &&
          (!l.fechaAsignacion || l.fechaAsignacion < licDesdeAsign)
        )
          return false;
        if (
          licHastaAsign &&
          (!l.fechaAsignacion || l.fechaAsignacion > licHastaAsign)
        )
          return false;
        return true;
      }),
    [licencias, licDesdeAsign, licHastaAsign]
  );

  const licenciasToRender = useMemo(
    () => licenciasFiltradas.slice(0, visibleLicencias),
    [licenciasFiltradas, visibleLicencias]
  );

  const total = useMemo(
    () =>
      tab === "activos"
        ? activosSolo.length
        : tab === "licencias"
        ? licenciasFiltradas.length
        : licStats?.total ?? 0,
    [tab, activosSolo.length, licenciasFiltradas.length, licStats]
  );

  const statsPorTipo = useMemo(
    () => Object.entries(licStats?.porTipo || {}).sort((a, b) => b[1] - a[1]),
    [licStats]
  );

  const statsPorProveedor = useMemo(
    () =>
      Object.entries(licStats?.porProveedor || {}).sort((a, b) => b[1] - a[1]),
    [licStats]
  );

  const statsMaxTipo = useMemo(
    () => (statsPorTipo.length ? statsPorTipo[0][1] : 0),
    [statsPorTipo]
  );

  const statsMaxProveedor = useMemo(
    () => (statsPorProveedor.length ? statsPorProveedor[0][1] : 0),
    [statsPorProveedor]
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
    sucursal: "",
    asignadoPara: "",
    fechaAsignacion: "",
  });
  function openCreateLic() {
    setEditLicId(null);
    setLicForm({
      cuenta: "",
      tipoLicencia: "",
      fechaCompra: "",
      sucursal: "",
      asignadoPara: "",
      fechaAsignacion: "",
    });
    setShowLicForm(true);
  }
  function openEditLic(l: Licencia) {
    if (l.activoId) return; // filas mapeadas desde activos: no editable aquí
    setEditLicId(l._id || null);
    setLicForm({
      proveedor: l.proveedor || undefined,
      cuenta: l.cuenta || "",
      tipoLicencia: l.tipoLicencia || "",
      fechaCompra: (l.fechaCompra || "").slice(0, 10),
      sucursal: l.sucursal || "",
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
        proveedor: licForm.proveedor,
        cuenta: licForm.cuenta,
        tipoLicencia: licForm.tipoLicencia,
        fechaCompra: licForm.fechaCompra,
        sucursal: licForm.sucursal,
        asignadoPara: licForm.asignadoPara,
        fechaAsignacion: licForm.fechaAsignacion,
      };
      if (!payload.fechaCompra) delete payload.fechaCompra;
      if (!payload.fechaAsignacion) delete payload.fechaAsignacion;
      if (!payload.proveedor) delete payload.proveedor;
      if (!payload.sucursal) delete payload.sucursal;
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

  /* ===== Asignar / Reasignar ===== */
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

  // Funcionalidad "Desasignar" eliminada segan requerimiento

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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 sm:px-6 lg:px-12 2xl:px-20 py-6 sm:py-8 lg:py-10">
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

      <div className="relative mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start md:items-end justify-between gap-4 gap-y-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Inventario
            </h1>
            <p className="text-neutral-300 text-sm">
              Activos y licencias con sus asignaciones.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
              type="button"
            >
              Volver
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
              type="button"
            >
              Cerrar sesión
            </button>
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
            <button
              className={`px-4 py-2 rounded-lg transition ${
                tab === "estadisticas"
                  ? "bg-neutral-900/70 text-neutral-100"
                  : "hover:bg-white/10 text-neutral-300"
              }`}
              onClick={() => setTab("estadisticas")}
            >
              Estadisticas
            </button>
          </div>
        </div>

        {/* Layout 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Filtros izquierda */}
          {tab !== "estadisticas" && (
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

                  <div>
                    <label className="block text-sm text-neutral-300">
                      Sucursal
                    </label>
                    <input
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                      value={sucursalAct}
                      onChange={(e) => setSucursalAct(e.target.value)}
                    />
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
                      Asignado a
                    </label>
                    <input
                      placeholder="Nombre o parte del nombre"
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                      value={licAsignadoPara}
                      onChange={(e) => setLicAsignadoPara(e.target.value)}
                    />
                  </div>
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
                      Sucursal
                    </label>
                    <input
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                      value={licSucursal}
                      onChange={(e) => setLicSucursal(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-300">
                      Proveedor
                    </label>
                    <select
                      className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                      value={licProveedor}
                      onChange={(e) => setLicProveedor(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {OPCIONES_PROVEEDOR.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
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
                      {tiposLicenciasFiltro.map((t) => (
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
          )}

          {/* Tabla derecha */}
          <section
            className={`${
              tab === "estadisticas" ? "lg:col-span-12" : "lg:col-span-9"
            } space-y-4 min-w-0`}
          >
            {tab === "estadisticas" ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md space-y-6">
                {loading ? (
                  <div className="text-neutral-300">Cargando...</div>
                ) : error ? (
                  <div className="text-red-300">{error}</div>
                ) : licStats ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <p className="text-sm text-neutral-300">
                          Total licencias
                        </p>
                        <div className="mt-2 text-3xl font-semibold">
                          {licStats.total}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <p className="text-sm text-neutral-300">Disponibles</p>
                        <div className="mt-2 text-3xl font-semibold text-emerald-400">
                          {licStats.disponibles}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <p className="text-sm text-neutral-300">Asignadas</p>
                        <div className="mt-2 text-3xl font-semibold text-orange-400">
                          {licStats.ocupadas}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <h3 className="text-base font-semibold">Por tipo</h3>
                        <ul className="mt-3 space-y-3">
                          {statsPorTipo.length === 0 ? (
                            <li className="text-sm text-neutral-300">
                              Sin datos.
                            </li>
                          ) : (
                            statsPorTipo.map(([tipo, count]) => (
                              <li key={tipo} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="truncate pr-2">{tipo}</span>
                                  <span className="font-semibold">{count}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-orange-500"
                                    style={{
                                      width: `${
                                        statsMaxTipo
                                          ? Math.max(
                                              (count / statsMaxTipo) * 100,
                                              8
                                            )
                                          : 100
                                      }%`,
                                    }}
                                  />
                                </div>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <h3 className="text-base font-semibold">
                          Por proveedor
                        </h3>
                        <ul className="mt-3 space-y-3">
                          {statsPorProveedor.length === 0 ? (
                            <li className="text-sm text-neutral-300">
                              Sin datos.
                            </li>
                          ) : (
                            statsPorProveedor.map(([prov, count]) => (
                              <li key={prov} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="truncate pr-2">{prov}</span>
                                  <span className="font-semibold">{count}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{
                                      width: `${
                                        statsMaxProveedor
                                          ? Math.max(
                                              (count / statsMaxProveedor) * 100,
                                              8
                                            )
                                          : 100
                                      }%`,
                                    }}
                                  />
                                </div>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-neutral-300">Sin datos.</div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-0 backdrop-blur-md overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto -mx-4 sm:mx-0">
                  {tab === "activos" ? (
                    <>
                      {/* Vista móvil: tarjetas */}
                      <div className="block lg:hidden divide-y divide-white/10">
                        {activosToRender.map((a) => (
                          <div key={a._id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-neutral-300">
                                  {a.categoria || "-"}
                                </div>
                                <div className="font-semibold truncate">
                                  {(a.marca || "") + " " + (a.modelo || "-")}
                                </div>
                                <ul className="mt-1 text-sm text-neutral-300 space-y-1">
                                  <li>
                                    <span className="text-neutral-400">
                                      Serie:
                                    </span>{" "}
                                    {a.numeroSerie || "-"}
                                  </li>
                                  <li>
                                    <span className="text-neutral-400">
                                      Sucursal:
                                    </span>{" "}
                                    {a.sucursal || "-"}
                                  </li>
                                  <li>
                                    <span className="text-neutral-400">
                                      Compra:
                                    </span>{" "}
                                    {a.fechaCompra
                                      ? new Date(
                                          a.fechaCompra
                                        ).toLocaleDateString()
                                      : "-"}
                                  </li>
                                  <li>
                                    <span className="text-neutral-400">
                                      Asignado a:
                                    </span>{" "}
                                    {a.asignadoPara || "-"}
                                  </li>
                                  <li>
                                    <span className="text-neutral-400">
                                      Asignación:
                                    </span>{" "}
                                    {a.fechaAsignacion
                                      ? new Date(
                                          a.fechaAsignacion
                                        ).toLocaleDateString()
                                      : "-"}
                                  </li>
                                </ul>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
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
                          </div>
                        ))}
                        {activosSolo.length === 0 && !loading && (
                          <div className="px-4 py-6 text-center text-neutral-300">
                            Sin resultados
                          </div>
                        )}
                      </div>

                      {/* Vista escritorio: tabla */}
                      <div className="hidden lg:block">
                        <table className="min-w-full text-sm">
                          <thead className="bg-black sticky top-0 z-10 backdrop-blur">
                            <tr>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Categoría
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Marca
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Modelo
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Serie
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Sucursal
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Compra
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Asignado a
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Asignación
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {activosToRender.map((a) => (
                              <tr
                                key={a._id}
                                className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors"
                              >
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  {a.categoria || "-"}
                                </td>
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  {a.marca || "-"}
                                </td>
                                <td
                                  className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate"
                                  title={a.modelo || undefined}
                                >
                                  {a.modelo || "-"}
                                </td>
                                <td
                                  className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate"
                                  title={a.numeroSerie || undefined}
                                >
                                  {a.numeroSerie || "-"}
                                </td>
                                <td
                                  className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate"
                                  title={a.sucursal || undefined}
                                >
                                  {a.sucursal || "-"}
                                </td>
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  {a.fechaCompra
                                    ? new Date(
                                        a.fechaCompra
                                      ).toLocaleDateString()
                                    : "-"}
                                </td>
                                <td
                                  className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate"
                                  title={a.asignadoPara || undefined}
                                >
                                  {a.asignadoPara || "-"}
                                </td>
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  {a.fechaAsignacion
                                    ? new Date(
                                        a.fechaAsignacion
                                      ).toLocaleDateString()
                                    : "-"}
                                </td>
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
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
                            {activosSolo.length === 0 && !loading && (
                              <tr>
                                <td
                                  className="px-4 py-6 text-center text-neutral-300"
                                  colSpan={9}
                                >
                                  Sin resultados
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Vista móvil: tarjetas */}
                      <div className="block lg:hidden divide-y divide-white/10">
                        {licenciasToRender.map((l) => (
                          <div key={l._id} className="p-4">
                            <div className="font-semibold truncate">
                              {l.cuenta || "-"}
                            </div>
                            <ul className="mt-1 text-sm text-neutral-300 space-y-1">
                              <li>
                                <span className="text-neutral-400">
                                  Proveedor:
                                </span>{" "}
                                {l.proveedor || "-"}
                              </li>
                              <li className="truncate">
                                <span className="text-neutral-400">Tipo:</span>{" "}
                                {l.tipoLicencia || "-"}
                              </li>
                              <li>
                                <span className="text-neutral-400">
                                  Compra:
                                </span>{" "}
                                {l.fechaCompra
                                  ? new Date(l.fechaCompra).toLocaleDateString()
                                  : "-"}
                              </li>
                              <li className="truncate">
                                <span className="text-neutral-400">
                                  Sucursal:
                                </span>{" "}
                                {l.sucursal || "-"}
                              </li>
                              <li className="truncate">
                                <span className="text-neutral-400">
                                  Asignado a:
                                </span>{" "}
                                {l.asignadoPara || "-"}
                              </li>
                              <li>
                                <span className="text-neutral-400">
                                  Asignación:
                                </span>{" "}
                                {l.fechaAsignacion
                                  ? new Date(
                                      l.fechaAsignacion
                                    ).toLocaleDateString()
                                  : "-"}
                              </li>
                            </ul>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
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
                          </div>
                        ))}
                        {licenciasFiltradas.length === 0 && !loading && (
                          <div className="px-4 py-6 text-center text-neutral-300">
                            Sin resultados
                          </div>
                        )}
                      </div>

                      {/* Vista escritorio: tabla */}
                      <div className="hidden lg:block">
                        <table className="min-w-full text-sm">
                          <thead className="bg-black sticky top-0 z-10 backdrop-blur">
                            <tr>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Cuenta
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Proveedor
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Tipo licencia
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Compra
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Sucursal
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Asignado a
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Asignación
                              </th>
                              <th className="text-left px-4 py-3 sm:whitespace-nowrap whitespace-normal">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {licenciasToRender.map((l) => (
                              <tr
                                key={l._id}
                                className="border-t border-white/10 odd:bg-white/[0.03] hover:bg-white/10 transition-colors"
                              >
                                <td
                                  className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate"
                                  title={l.cuenta || undefined}
                                >
                                  {l.cuenta || "-"}
                                </td>
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  {l.proveedor || "-"}
                                </td>
                                <td
                                  className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[240px] truncate"
                                  title={l.tipoLicencia || undefined}
                                >
                                  {l.tipoLicencia || "-"}
                                </td>
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  {l.fechaCompra
                                    ? new Date(
                                        l.fechaCompra
                                      ).toLocaleDateString()
                                    : "-"}
                                </td>
                                <td
                                  className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate"
                                  title={l.sucursal || undefined}
                                >
                                  {l.sucursal || "-"}
                                </td>
                                <td
                                  className="px-4 py-2 sm:whitespace-nowrap whitespace-normal max-w-[200px] truncate"
                                  title={l.asignadoPara || undefined}
                                >
                                  {l.asignadoPara || "-"}
                                </td>
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  {l.fechaAsignacion
                                    ? new Date(
                                        l.fechaAsignacion
                                      ).toLocaleDateString()
                                    : "-"}
                                </td>
                                <td className="px-4 py-2 sm:whitespace-nowrap whitespace-normal">
                                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
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
                                          {l.asignadoPara
                                            ? "Reasignar"
                                            : "Asignar"}
                                        </button>
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
                            {licenciasFiltradas.length === 0 && !loading && (
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
                      </div>
                      {visibleLicencias < licenciasFiltradas.length && (
                        <div className="px-4 py-4 flex justify-center border-t border-white/10">
                          <button
                            className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/10 transition"
                            onClick={() =>
                              setVisibleLicencias((v) => v + PAGE_SIZE)
                            }
                          >
                            Mostrar más
                          </button>
                        </div>
                      )}
                    </>
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
            )}
          </section>
        </div>
      </div>

      {/* Modal Activo (crear/editar) */}
      {showForm && tab === "activos" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
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
              {/* Selector de Proveedor eliminado del formulario de Activos */}

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
              {/* Selector de Proveedor eliminado del formulario de Activos */}

              <div>
                <label className="block text-sm text-neutral-300">
                  Modelo {!editId && <span className="text-orange-400">*</span>}
                </label>
                {editId ? (
                  <input
                    className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    value={form.modelo || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, modelo: e.target.value }))
                    }
                  />
                ) : (
                  <select
                    className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                    value={form.modelo || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const spec = specs.find((s) => s.modelo === value);
                      setForm(
                        (f) =>
                          ({
                            ...f,
                            modelo: value,
                            marca: spec?.marca ?? f.marca,
                            categoria:
                              (f as any).categoria ||
                              spec?.categoria ||
                              (f as any).categoria,
                          } as any)
                      );
                    }}
                  >
                    <option value="">Seleccione un modelo</option>
                    {specs.map((s) => (
                      <option key={s._id || s.modelo} value={s.modelo}>
                        {s.modelo}
                      </option>
                    ))}
                  </select>
                )}
                {!editId && specs.length === 0 && (
                  <p className="mt-1 text-xs text-amber-300">
                    No hay modelos cargados. Use "Crear modelo" para agregar uno
                    nuevo.
                  </p>
                )}
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
                  Sucursal
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={form.sucursal || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sucursal: e.target.value }))
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
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
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
                  Proveedor *
                </label>
                <select
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={licForm.proveedor || ""}
                  onChange={(e) =>
                    setLicForm((f) => ({
                      ...f,
                      proveedor: e.target.value as any,
                      // Si el tipo actual no pertenece al nuevo proveedor, limpiar
                      tipoLicencia:
                        e.target.value === "SAP" &&
                        f.tipoLicencia &&
                        (
                          OPCIONES_TIPO_LIC_MAP.SAP as readonly string[]
                        ).includes(f.tipoLicencia)
                          ? f.tipoLicencia
                          : e.target.value === "Office" &&
                            f.tipoLicencia &&
                            (
                              OPCIONES_TIPO_LIC_MAP.Office as readonly string[]
                            ).includes(f.tipoLicencia)
                          ? f.tipoLicencia
                          : "",
                    }))
                  }
                >
                  <option value="">Seleccione</option>
                  {OPCIONES_PROVEEDOR.map((p) => (
                    <option key={p} value={p}>
                      {p}
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
                  value={licForm.tipoLicencia || ""}
                  onChange={(e) =>
                    setLicForm((f) => ({ ...f, tipoLicencia: e.target.value }))
                  }
                >
                  <option value="">Seleccione</option>
                  {(licForm.proveedor === "SAP"
                    ? OPCIONES_TIPO_LIC_MAP.SAP
                    : licForm.proveedor === "Office"
                    ? OPCIONES_TIPO_LIC_MAP.Office
                    : []
                  ).map((t) => (
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
                  Sucursal
                </label>
                <input
                  className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
                  value={licForm.sucursal || ""}
                  onChange={(e) =>
                    setLicForm((f) => ({ ...f, sucursal: e.target.value }))
                  }
                />
              </div>
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
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
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
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
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
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
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
                        <span className="font-medium">{m.accion}</span> para{" "}
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
