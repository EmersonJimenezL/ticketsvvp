import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Activo,
  ActivoFilters,
  AssignContext,
  DeleteContext,
  Especificacion,
  HistMovimiento,
  Licencia,
  LicenciaFilters,
  LicenciaStats,
  TabKey,
} from "../types";
import {
  API_BASE,
  OPCIONES_TIPO_LIC_MAP,
  PAGE_SIZE,
} from "../constants";
import { useDebouncedValue } from "./useDebouncedValue";

const ACTIVO_FILTERS_DEFAULT: ActivoFilters = {
  categoria: "",
  sucursal: "",
  desdeCompra: "",
  hastaCompra: "",
  desdeAsignacion: "",
  hastaAsignacion: "",
  soloSinAsignacion: false,
};

const LICENCIA_FILTERS_DEFAULT: LicenciaFilters = {
  cuenta: "",
  proveedor: "",
  tipoLicencia: "",
  asignadoPara: "",
  sucursal: "",
  desdeCompra: "",
  hastaCompra: "",
  desdeAsignacion: "",
  hastaAsignacion: "",
};

export function useGestionActivosState() {
  const [tab, setTab] = useState<TabKey>("activos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activos, setActivos] = useState<Activo[]>([]);
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [specs, setSpecs] = useState<Especificacion[]>([]);
  const [licStats, setLicStats] = useState<LicenciaStats | null>(null);

  const [visibleActivos, setVisibleActivos] = useState(PAGE_SIZE);
  const [visibleLicencias, setVisibleLicencias] = useState(PAGE_SIZE);

  const [activoFilters, setActivoFilters] = useState<ActivoFilters>(
    ACTIVO_FILTERS_DEFAULT
  );
  const [licenciaFilters, setLicenciaFilters] = useState<LicenciaFilters>(
    LICENCIA_FILTERS_DEFAULT
  );

  const debouncedCuenta = useDebouncedValue(licenciaFilters.cuenta, 300);
  const debouncedAsignado = useDebouncedValue(
    licenciaFilters.asignadoPara,
    300
  );

  const tiposLicenciasFiltro = useMemo(() => {
    if (licenciaFilters.proveedor === "SAP") {
      return [...OPCIONES_TIPO_LIC_MAP.SAP];
    }
    if (licenciaFilters.proveedor === "Office") {
      return [...OPCIONES_TIPO_LIC_MAP.Office];
    }
    return [
      ...OPCIONES_TIPO_LIC_MAP.SAP,
      ...OPCIONES_TIPO_LIC_MAP.Office,
    ];
  }, [licenciaFilters.proveedor]);

  const fetchActivos = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", "500");
    if (activoFilters.soloSinAsignacion) params.set("soloSinAsignacion", "1");
    if (activoFilters.categoria) params.set("categoria", activoFilters.categoria);
    if (activoFilters.sucursal) params.set("sucursal", activoFilters.sucursal);
    if (activoFilters.desdeCompra) params.set("desdeCompra", activoFilters.desdeCompra);
    if (activoFilters.hastaCompra) params.set("hastaCompra", activoFilters.hastaCompra);
    if (activoFilters.desdeAsignacion) params.set("desdeAsign", activoFilters.desdeAsignacion);
    if (activoFilters.hastaAsignacion) params.set("hastaAsign", activoFilters.hastaAsignacion);

    const response = await fetch(`${API_BASE}/activos?${params.toString()}`);
    const json = await response.json();
    if (!json.ok) {
      throw new Error(json.error || "Error al listar activos");
    }
    setActivos(json.data);
    setVisibleActivos(PAGE_SIZE);
  }, [activoFilters]);

  const fetchEspecificaciones = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/especificaciones`);
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "Error al listar especificaciones");
      }
      setSpecs(Array.isArray(json.data) ? json.data : []);
    } catch {
      setSpecs([]);
    }
  }, []);

  const fetchLicencias = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", "500");
    if (debouncedCuenta) params.set("cuenta", debouncedCuenta);
    if (licenciaFilters.proveedor) params.set("proveedor", licenciaFilters.proveedor);
    if (licenciaFilters.tipoLicencia) params.set("tipoLicencia", licenciaFilters.tipoLicencia);
    if (debouncedAsignado) params.set("asignadoPara", debouncedAsignado);
    if (licenciaFilters.desdeCompra) params.set("desdeCompra", licenciaFilters.desdeCompra);
    if (licenciaFilters.hastaCompra) params.set("hastaCompra", licenciaFilters.hastaCompra);
    if (licenciaFilters.sucursal) params.set("sucursal", licenciaFilters.sucursal);

    const activosLicParams = new URLSearchParams();
    activosLicParams.set("categoria", "licencias");
    activosLicParams.set("limit", "500");
    if (licenciaFilters.sucursal) {
      activosLicParams.set("sucursal", licenciaFilters.sucursal);
    }

    const [licResponse, activosLicResponse] = await Promise.all([
      fetch(`${API_BASE}/licencias?${params.toString()}`).catch(() => null),
      fetch(`${API_BASE}/activos?${activosLicParams.toString()}`).catch(
        () => null
      ),
    ]);

    const merged: Licencia[] = [];

    try {
      if (licResponse) {
        const json = await licResponse.json();
        if (json?.ok && Array.isArray(json.data)) merged.push(...json.data);
      }
    } catch {
      // Ignorar fallas parciales
    }

    try {
      if (activosLicResponse) {
        const json = await activosLicResponse.json();
        if (json?.ok && Array.isArray(json.data)) {
          merged.push(
            ...json.data.map((item: any) => ({
              _id: item?._id,
              proveedor: item?.licencia?.proveedor,
              cuenta: item?.licencia?.cuenta,
              tipoLicencia: item?.licencia?.tipoLicencia,
              fechaCompra: item?.fechaCompra,
              sucursal: item?.sucursal,
              asignadoPara: item?.licencia?.usuarioNombre || item?.asignadoPara,
              fechaAsignacion:
                item?.licencia?.asignadaEn || item?.fechaAsignacion || undefined,
              activoId: item?._id,
              notas: item?.notas,
              createdAt: item?.createdAt,
              updatedAt: item?.updatedAt,
            }))
          );
        }
      }
    } catch {
      // Ignorar fallas parciales
    }

    let list = merged;

    if (debouncedAsignado) {
      const needle = debouncedAsignado.toLowerCase();
      list = list.filter((lic) =>
        (lic.asignadoPara || "").toLowerCase().includes(needle)
      );
    }
    if (debouncedCuenta) {
      const needle = debouncedCuenta.toLowerCase();
      list = list.filter((lic) => (lic.cuenta || "").toLowerCase().includes(needle));
    }
    if (licenciaFilters.desdeCompra) {
      list = list.filter(
        (lic) =>
          (lic.fechaCompra || "").slice(0, 10) >= licenciaFilters.desdeCompra
      );
    }
    if (licenciaFilters.hastaCompra) {
      list = list.filter(
        (lic) =>
          (lic.fechaCompra || "").slice(0, 10) <= licenciaFilters.hastaCompra
      );
    }
    if (licenciaFilters.sucursal) {
      const needle = licenciaFilters.sucursal.toLowerCase();
      list = list.filter((lic) =>
        (lic.sucursal || "").toLowerCase().includes(needle)
      );
    }
    if (licenciaFilters.proveedor) {
      const needle = licenciaFilters.proveedor.toLowerCase();
      list = list.filter((lic) => (lic.proveedor || "").toLowerCase() === needle);
    }

    setLicencias(list);
    setVisibleLicencias(PAGE_SIZE);
  }, [
    debouncedCuenta,
    debouncedAsignado,
    licenciaFilters.proveedor,
    licenciaFilters.tipoLicencia,
    licenciaFilters.desdeCompra,
    licenciaFilters.hastaCompra,
    licenciaFilters.sucursal,
  ]);

  const fetchLicStats = useCallback(async () => {
    const response = await fetch(`${API_BASE}/licencias/stats`);
    const json = await response.json();
    if (!json.ok) {
      throw new Error(json.error || "Error al obtener estadisticas");
    }
    setLicStats(json.data || null);
  }, []);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (tab === "activos") await fetchActivos();
      else if (tab === "licencias") await fetchLicencias();
      else await fetchLicStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, fetchActivos, fetchLicencias, fetchLicStats]);

  useEffect(() => {
    cargar();
    fetchEspecificaciones();
  }, [cargar, fetchEspecificaciones]);

  useEffect(() => {
    setVisibleActivos(PAGE_SIZE);
  }, [activos]);

  useEffect(() => {
    setVisibleLicencias(PAGE_SIZE);
  }, [licencias, licenciaFilters.desdeAsignacion, licenciaFilters.hastaAsignacion, licenciaFilters.sucursal]);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Activo>({
    categoria: "",
    marca: "",
    modelo: "",
    fechaCompra: "",
    numeroSerie: "",
    numeroFactura: "",
    detalles: "",
    sucursal: "",
    asignadoPara: "",
    fechaAsignacion: "",
  });

  const updateActivoForm = useCallback(
    (changes: Partial<Activo>) =>
      setForm((prev) => ({ ...prev, ...changes })),
    []
  );

  const openCreate = useCallback(() => {
    setEditId(null);
    setForm({
      categoria: "",
      marca: "",
      modelo: "",
      fechaCompra: "",
      numeroSerie: "",
      numeroFactura: "",
      detalles: "",
      sucursal: "",
      asignadoPara: "",
      fechaAsignacion: "",
    });
    setShowForm(true);
  }, []);

  const openEdit = useCallback((activo: Activo) => {
    setEditId(activo._id || null);
    setForm({
      categoria: activo.categoria || "",
      marca: activo.marca || "",
      modelo: activo.modelo || "",
      fechaCompra: (activo.fechaCompra || "").slice(0, 10),
      numeroSerie: activo.numeroSerie || "",
      numeroFactura: (activo as any).numeroFactura || "",
      detalles: (activo as any).detalles || "",
      sucursal: (activo as any).sucursal || "",
      asignadoPara: (activo as any).asignadoPara || "",
      fechaAsignacion: (activo.fechaAsignacion || "").slice(0, 10),
    });
    setShowForm(true);
  }, []);

  const submitForm = useCallback(async () => {
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
        numeroFactura: form.numeroFactura,
        detalles: form.detalles,
        sucursal: form.sucursal,
        asignadoPara: form.asignadoPara,
        fechaAsignacion: form.fechaAsignacion,
      };
      if (!payload.fechaCompra) delete payload.fechaCompra;
      if (!payload.fechaAsignacion) delete payload.fechaAsignacion;
      if (!payload.numeroFactura) delete payload.numeroFactura;
      if (!payload.detalles) delete payload.detalles;
      if (!payload.sucursal) delete payload.sucursal;

      const method = editId ? "PATCH" : "POST";
      const url = editId ? `${API_BASE}/activos/${editId}` : `${API_BASE}/activos`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "Error al guardar");
      }
      setShowForm(false);
      await fetchActivos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [editId, form, fetchActivos]);

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

  const updateLicForm = useCallback(
    (changes: Partial<Licencia>) =>
      setLicForm((prev) => ({ ...prev, ...changes })),
    []
  );

  const openCreateLic = useCallback(() => {
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
  }, []);

  const openEditLic = useCallback((licencia: Licencia) => {
    if (licencia.activoId) return; // No editable desde activos mapeados
    setEditLicId(licencia._id || null);
    setLicForm({
      proveedor: licencia.proveedor || undefined,
      cuenta: licencia.cuenta || "",
      tipoLicencia: licencia.tipoLicencia || "",
      fechaCompra: (licencia.fechaCompra || "").slice(0, 10),
      sucursal: licencia.sucursal || "",
      asignadoPara: licencia.asignadoPara || "",
      fechaAsignacion: (licencia.fechaAsignacion || "").slice(0, 10),
      _id: licencia._id,
    });
    setShowLicForm(true);
  }, []);

  const submitLicForm = useCallback(async () => {
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
        ? `${API_BASE}/licencias/${editLicId}`
        : `${API_BASE}/licencias`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "Error al guardar licencia");
      }
      setShowLicForm(false);
      await fetchLicencias();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [editLicId, licForm, fetchLicencias]);

  const [showAssign, setShowAssign] = useState(false);
  const [assignCtx, setAssignCtx] = useState<AssignContext | null>(null);

  const updateAssignCtx = useCallback(
    (changes: Partial<AssignContext>) =>
      setAssignCtx((prev) => (prev ? { ...prev, ...changes } : prev)),
    []
  );

  const openAssign = useCallback(
    (
      tipo: "activo" | "licencia",
      id: string,
      titulo: string,
      currentUser: string,
      currentDate?: string
    ) => {
      setAssignCtx({
        tipo,
        id,
        titulo,
        asignadoPara: currentUser || "",
        fechaAsignacion: (currentDate || "").slice(0, 10),
      });
      setShowAssign(true);
    },
    []
  );

  const submitAssign = useCallback(async () => {
    if (!assignCtx) return;
    try {
      setLoading(true);
      setError(null);
      const url =
        assignCtx.tipo === "activo"
          ? `${API_BASE}/activos/${assignCtx.id}`
          : `${API_BASE}/licencias/${assignCtx.id}`;
      const payload: any = {
        asignadoPara: assignCtx.asignadoPara,
        fechaAsignacion: assignCtx.fechaAsignacion,
      };
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "No se pudo asignar");
      }
      setShowAssign(false);
      if (assignCtx.tipo === "activo") await fetchActivos();
      else await fetchLicencias();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assignCtx, fetchActivos, fetchLicencias]);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteCtx, setDeleteCtx] = useState<DeleteContext | null>(null);

  const openDelete = useCallback(
    (tipo: "activo" | "licencia", id: string, titulo: string) => {
      setDeleteCtx({ tipo, id, titulo });
      setShowDelete(true);
    },
    []
  );

  const submitDelete = useCallback(async () => {
    if (!deleteCtx) return;
    try {
      setLoading(true);
      setError(null);
      const url =
        deleteCtx.tipo === "activo"
          ? `${API_BASE}/activos/${deleteCtx.id}`
          : `${API_BASE}/licencias/${deleteCtx.id}`;
      const response = await fetch(url, { method: "DELETE" });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "No se pudo eliminar");
      }
      setShowDelete(false);
      if (deleteCtx.tipo === "activo") await fetchActivos();
      else await fetchLicencias();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deleteCtx, fetchActivos, fetchLicencias]);

  const [showHist, setShowHist] = useState(false);
  const [histTitle, setHistTitle] = useState<string>("");
  const [histMovs, setHistMovs] = useState<HistMovimiento[]>([]);

  const openHistorial = useCallback(
    async (tipo: "activo" | "licencia", id: string, titulo: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE}/historicos/${tipo}/${id}`);
        const json = await response.json();
        if (!json.ok) {
          throw new Error(json.error || "No se pudo obtener historial");
        }
        setHistTitle(titulo);
        setHistMovs(json?.data?.movimientos || []);
        setShowHist(true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const limpiarFiltros = useCallback(() => {
    if (tab === "activos") {
      setActivoFilters({ ...ACTIVO_FILTERS_DEFAULT });
    } else if (tab === "licencias") {
      setLicenciaFilters({ ...LICENCIA_FILTERS_DEFAULT });
    }
  }, [tab]);

  const activosSolo = useMemo(
    () =>
      activos.filter((item: any) => {
        const cat = (item?.categoria || "").toString().toLowerCase();
        if (cat === "licencias") return false;
        if ("licencia" in item && item.licencia) return false;
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
      licencias.filter((lic) => {
        if (
          licenciaFilters.desdeAsignacion &&
          (!lic.fechaAsignacion ||
            lic.fechaAsignacion < licenciaFilters.desdeAsignacion)
        ) {
          return false;
        }
        if (
          licenciaFilters.hastaAsignacion &&
          (!lic.fechaAsignacion ||
            lic.fechaAsignacion > licenciaFilters.hastaAsignacion)
        ) {
          return false;
        }
        return true;
      }),
    [licencias, licenciaFilters.desdeAsignacion, licenciaFilters.hastaAsignacion]
  );

  const licenciasToRender = useMemo(
    () => licenciasFiltradas.slice(0, visibleLicencias),
    [licenciasFiltradas, visibleLicencias]
  );

  const total = useMemo(() => {
    if (tab === "activos") return activosSolo.length;
    if (tab === "licencias") return licenciasFiltradas.length;
    return licStats?.total ?? 0;
  }, [tab, activosSolo.length, licenciasFiltradas.length, licStats]);

  const statsPorTipo = useMemo(
    () => Object.entries(licStats?.porTipo || {}).sort((a, b) => b[1] - a[1]),
    [licStats]
  );

  const statsPorProveedor = useMemo(
    () =>
      Object.entries(licStats?.porProveedor || {}).sort(
        (a, b) => b[1] - a[1]
      ),
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

  const updateActivoFilters = useCallback(
    (changes: Partial<ActivoFilters>) =>
      setActivoFilters((prev) => ({ ...prev, ...changes })),
    []
  );

  const updateLicenciaFilters = useCallback(
    (changes: Partial<LicenciaFilters>) =>
      setLicenciaFilters((prev) => ({ ...prev, ...changes })),
    []
  );

  return {
    tab,
    setTab,
    loading,
    error,
    total,
    specs,
    stats: {
      raw: licStats,
      porTipo: statsPorTipo,
      porProveedor: statsPorProveedor,
      maxTipo: statsMaxTipo,
      maxProveedor: statsMaxProveedor,
    },
    filtros: {
      activos: {
        valores: activoFilters,
        actualizar: updateActivoFilters,
        aplicar: fetchActivos,
      },
      licencias: {
        valores: licenciaFilters,
        actualizar: updateLicenciaFilters,
        aplicar: fetchLicencias,
        tiposDisponibles: tiposLicenciasFiltro,
      },
      limpiar: limpiarFiltros,
    },
    activos: {
      items: activosToRender,
      total: activosSolo.length,
      tieneMas: visibleActivos < activosSolo.length,
      verMas: () => setVisibleActivos((prev) => prev + PAGE_SIZE),
      abrirCrear: openCreate,
      abrirEditar: openEdit,
      mostrarFormulario: showForm,
      cerrarFormulario: () => setShowForm(false),
      editarId: editId,
      form,
      actualizarForm: updateActivoForm,
      enviar: submitForm,
    },
    licencias: {
      items: licenciasToRender,
      total: licenciasFiltradas.length,
      tieneMas: visibleLicencias < licenciasFiltradas.length,
      verMas: () => setVisibleLicencias((prev) => prev + PAGE_SIZE),
      abrirCrear: openCreateLic,
      abrirEditar: openEditLic,
      mostrarFormulario: showLicForm,
      cerrarFormulario: () => setShowLicForm(false),
      editarId: editLicId,
      form: licForm,
      actualizarForm: updateLicForm,
      enviar: submitLicForm,
      tiposDisponibles: tiposLicenciasFiltro,
    },
    modales: {
      asignar: {
        visible: showAssign,
        contexto: assignCtx,
        abrir: openAssign,
        actualizar: updateAssignCtx,
        cerrar: () => setShowAssign(false),
        enviar: submitAssign,
      },
      eliminar: {
        visible: showDelete,
        contexto: deleteCtx,
        abrir: openDelete,
        cerrar: () => setShowDelete(false),
        enviar: submitDelete,
      },
      historial: {
        visible: showHist,
        titulo: histTitle,
        movimientos: histMovs,
        abrir: openHistorial,
        cerrar: () => setShowHist(false),
      },
    },
    refrescar: cargar,
  };
}
