import { useState, useCallback, useMemo, useEffect } from "react";
import { useActivos } from "./useActivos";
import { useLicencias } from "./useLicencias";
import { useActivoForm } from "./useActivoForm";
import { useLicenciaForm } from "./useLicenciaForm";
import { useEspecificaciones } from "./useEspecificaciones";
import { validateActivo } from "../validation/activoValidation";
import { validateLicencia } from "../validation/licenciaValidation";
import type {
  Activo,
  Licencia,
  ActivoFilters,
  LicenciaFilters,
  AssignContext,
  DeleteContext,
  HistMovimiento,
  TabKey,
} from "../types";
import { API_BASE, OPCIONES_TIPO_LIC_MAP } from "../constants";

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
  soloDisponibles: false,
};

export function useGestionActivos() {
  const [tab, setTab] = useState<TabKey>("activos");
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Hooks modulares
  const activosHook = useActivos();
  const licenciasHook = useLicencias();
  const activoForm = useActivoForm();
  const licenciaForm = useLicenciaForm();
  const { specs } = useEspecificaciones();

  // Filtros
  const [activoFilters, setActivoFilters] = useState<ActivoFilters>(ACTIVO_FILTERS_DEFAULT);
  const [licenciaFilters, setLicenciaFilters] = useState<LicenciaFilters>(LICENCIA_FILTERS_DEFAULT);

  // Paginación
  const [activoPage, setActivoPage] = useState(1);
  const [licenciaPage, setLicenciaPage] = useState(1);
  const pageSize = 25;

  // Stats para tab de estadísticas
  const [licStats, setLicStats] = useState<any>(null);

  // Modales de asignación, eliminación e historial
  const [assignModal, setAssignModal] = useState<{
    visible: boolean;
    contexto: AssignContext;
  }>({
    visible: false,
    contexto: {
      tipo: "activo",
      id: "",
      nombre: "",
      asignadoPara: "",
      fechaAsignacion: "",
    },
  });

  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    contexto: DeleteContext;
  }>({
    visible: false,
    contexto: { tipo: "activo", id: "", nombre: "" },
  });

  const [historialModal, setHistorialModal] = useState<{
    visible: boolean;
    titulo: string;
    movimientos: HistMovimiento[];
  }>({
    visible: false,
    titulo: "",
    movimientos: [],
  });

  // Tipos disponibles de licencias según proveedor
  const tiposLicenciasFiltro = useMemo(() => {
    if (licenciaFilters.proveedor === "SAP") {
      return [...OPCIONES_TIPO_LIC_MAP.SAP];
    }
    if (licenciaFilters.proveedor === "Office") {
      return [...OPCIONES_TIPO_LIC_MAP.Office];
    }
    return [...OPCIONES_TIPO_LIC_MAP.SAP, ...OPCIONES_TIPO_LIC_MAP.Office];
  }, [licenciaFilters.proveedor]);

  // Cargar datos según filtros y página
  const cargarActivos = useCallback(async () => {
    setGlobalError(null);
    try {
      await activosHook.fetchActivos(activoFilters, activoPage, pageSize);
    } catch (err: any) {
      setGlobalError(err.message || "Error al cargar activos");
    }
  }, [activosHook, activoFilters, activoPage, pageSize]);

  const cargarLicencias = useCallback(async () => {
    setGlobalError(null);
    try {
      await licenciasHook.fetchLicencias(licenciaFilters, licenciaPage, pageSize);
    } catch (err: any) {
      setGlobalError(err.message || "Error al cargar licencias");
    }
  }, [licenciasHook, licenciaFilters, licenciaPage, pageSize]);

  const cargarStats = useCallback(async () => {
    setGlobalError(null);
    try {
      const response = await fetch(`${API_BASE}/licencias/stats`);
      const json = await response.json();
      if (!json.ok) throw new Error("Error al cargar estadísticas");

      setLicStats(json.data || null);
    } catch (err: any) {
      setGlobalError(err.message || "Error al cargar estadísticas");
    }
  }, []);

  // Refrescar según tab actual
  const refrescar = useCallback(async () => {
    if (tab === "activos") {
      await cargarActivos();
    } else if (tab === "licencias") {
      await cargarLicencias();
    } else if (tab === "estadisticas") {
      await cargarStats();
    }
  }, [tab, cargarActivos, cargarLicencias, cargarStats]);

  // Handlers de formularios de activos
  const abrirCrearActivo = useCallback(() => {
    activoForm.openCreate();
  }, [activoForm]);

  const abrirEditarActivo = useCallback(
    (activo: Activo) => {
      activoForm.openEdit(activo);
    },
    [activoForm]
  );

  const enviarActivo = useCallback(async () => {
    setGlobalError(null);
    const errors = validateActivo(activoForm.form, Boolean(activoForm.editId));
    if (errors.length > 0) {
      setGlobalError(errors.map((e) => e.message).join(", "));
      return;
    }

    try {
      if (activoForm.editId) {
        await activosHook.updateActivo(activoForm.editId, activoForm.form);
      } else {
        await activosHook.createActivo(activoForm.form);
      }
      activoForm.closeForm();
      await cargarActivos();
    } catch (err: any) {
      setGlobalError(err.message || "Error al guardar activo");
    }
  }, [activoForm, activosHook, cargarActivos]);

  // Handlers de formularios de licencias
  const abrirCrearLicencia = useCallback(() => {
    licenciaForm.openCreate();
  }, [licenciaForm]);

  const abrirEditarLicencia = useCallback(
    (licencia: Licencia) => {
      licenciaForm.openEdit(licencia);
    },
    [licenciaForm]
  );

  const enviarLicencia = useCallback(async () => {
    setGlobalError(null);
    const errors = validateLicencia(licenciaForm.form, Boolean(licenciaForm.editId));
    if (errors.length > 0) {
      setGlobalError(errors.map((e) => e.message).join(", "));
      return;
    }

    try {
      if (licenciaForm.editId) {
        await licenciasHook.updateLicencia(licenciaForm.editId, licenciaForm.form);
      } else {
        await licenciasHook.createLicencia(licenciaForm.form);
      }
      licenciaForm.closeForm();
      await cargarLicencias();
    } catch (err: any) {
      setGlobalError(err.message || "Error al guardar licencia");
    }
  }, [licenciaForm, licenciasHook, cargarLicencias]);

  // Modal de asignación
  const abrirAsignarModal = useCallback(
    (
      tipo: "activo" | "licencia",
      id: string,
      nombre: string,
      asignadoPara: string,
      fechaAsignacion: string
    ) => {
      setAssignModal({
        visible: true,
        contexto: { tipo, id, nombre, asignadoPara, fechaAsignacion },
      });
    },
    []
  );

  const actualizarAsignacion = useCallback(
    (changes: Partial<Pick<AssignContext, "asignadoPara" | "fechaAsignacion">>) => {
      setAssignModal((prev) => ({
        ...prev,
        contexto: { ...prev.contexto, ...changes },
      }));
    },
    []
  );

  const enviarAsignacion = useCallback(async () => {
    const { tipo, id, asignadoPara, fechaAsignacion } = assignModal.contexto;
    setGlobalError(null);

    try {
      const endpoint =
        tipo === "activo" ? `${API_BASE}/activos/${id}` : `${API_BASE}/api/licencias/${id}`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignadoPara, fechaAsignacion }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Error al asignar");

      setAssignModal({ visible: false, contexto: assignModal.contexto });
      await refrescar();
    } catch (err: any) {
      setGlobalError(err.message || "Error al asignar");
    }
  }, [assignModal, refrescar]);

  // Modal de eliminación
  const abrirEliminarModal = useCallback(
    (tipo: "activo" | "licencia", id: string, nombre: string) => {
      setDeleteModal({
        visible: true,
        contexto: { tipo, id, nombre },
      });
    },
    []
  );

  const enviarEliminacion = useCallback(async () => {
    const { tipo, id } = deleteModal.contexto;
    setGlobalError(null);

    try {
      if (tipo === "activo") {
        await activosHook.deleteActivo(id);
      } else {
        await licenciasHook.deleteLicencia(id);
      }
      setDeleteModal({ visible: false, contexto: deleteModal.contexto });
      await refrescar();
    } catch (err: any) {
      setGlobalError(err.message || "Error al eliminar");
    }
  }, [deleteModal, activosHook, licenciasHook, refrescar]);

  // Modal de historial
  const abrirHistorialModal = useCallback(
    async (tipo: "activo" | "licencia", id: string, nombre: string) => {
      setGlobalError(null);
      try {
        const endpoint =
          tipo === "activo"
            ? `${API_BASE}/activos/${id}/historial`
            : `${API_BASE}/api/licencias/${id}/historial`;
        const response = await fetch(endpoint);
        const json = await response.json();
        if (!json.ok) throw new Error("Error al cargar historial");

        setHistorialModal({
          visible: true,
          titulo: nombre,
          movimientos: json.data || [],
        });
      } catch (err: any) {
        setGlobalError(err.message || "Error al cargar historial");
      }
    },
    []
  );

  // Aplicar filtros (resetea página a 1)
  const aplicarFiltrosActivos = useCallback(() => {
    setActivoPage(1);
    cargarActivos();
  }, [cargarActivos]);

  const aplicarFiltrosLicencias = useCallback(() => {
    setLicenciaPage(1);
    cargarLicencias();
  }, [cargarLicencias]);

  const limpiarFiltros = useCallback(() => {
    setActivoFilters(ACTIVO_FILTERS_DEFAULT);
    setLicenciaFilters(LICENCIA_FILTERS_DEFAULT);
    setActivoPage(1);
    setLicenciaPage(1);
  }, []);

  // Stats procesadas
  const statsPorTipo = useMemo(
    () => Object.entries(licStats?.porTipo || {}).sort((a, b) => b[1] - a[1]),
    [licStats]
  );

  const statsPorProveedor = useMemo(
    () => Object.entries(licStats?.porProveedor || {}).sort((a, b) => b[1] - a[1]),
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

  // Cargar datos al cambiar tab o página
  useEffect(() => {
    if (tab === "activos") {
      cargarActivos();
    } else if (tab === "licencias") {
      cargarLicencias();
    } else if (tab === "estadisticas") {
      cargarStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activoPage, licenciaPage, activoFilters, licenciaFilters]);

  // Loading global
  const loading = activosHook.loading || licenciasHook.loading;

  return {
    // Tab
    tab,
    setTab,

    // Estado global
    loading,
    error: globalError || activosHook.error || licenciasHook.error,
    total: tab === "activos" ? activosHook.activos.length : licenciasHook.licencias.length,

    // Specs
    specs,

    // Stats
    stats: {
      raw: licStats,
      porTipo: statsPorTipo,
      porProveedor: statsPorProveedor,
      maxTipo: statsMaxTipo,
      maxProveedor: statsMaxProveedor,
    },

    // Filtros
    filtros: {
      activos: {
        valores: activoFilters,
        actualizar: (changes: Partial<ActivoFilters>) =>
          setActivoFilters((prev) => ({ ...prev, ...changes })),
        aplicar: aplicarFiltrosActivos,
      },
      licencias: {
        valores: licenciaFilters,
        tiposDisponibles: tiposLicenciasFiltro,
        actualizar: (changes: Partial<LicenciaFilters>) =>
          setLicenciaFilters((prev) => ({ ...prev, ...changes })),
        aplicar: aplicarFiltrosLicencias,
      },
      limpiar: limpiarFiltros,
    },

    // Activos
    activos: {
      items: activosHook.activos,
      total: activosHook.totalCount,
      currentPage: activoPage,
      pageSize,
      totalPages: Math.ceil(activosHook.totalCount / pageSize),
      goToPage: (page: number) => {
        setActivoPage(page);
      },
      nextPage: () => {
        if (activoPage < Math.ceil(activosHook.totalCount / pageSize)) {
          setActivoPage((p) => p + 1);
        }
      },
      prevPage: () => {
        if (activoPage > 1) {
          setActivoPage((p) => p - 1);
        }
      },
      mostrarFormulario: activoForm.showForm,
      editarId: activoForm.editId,
      form: activoForm.form,
      abrirCrear: abrirCrearActivo,
      abrirEditar: abrirEditarActivo,
      cerrarFormulario: activoForm.closeForm,
      actualizarForm: activoForm.updateForm,
      enviar: enviarActivo,
    },

    // Licencias
    licencias: {
      items: licenciasHook.licencias,
      total: licenciasHook.totalCount,
      currentPage: licenciaPage,
      pageSize,
      totalPages: Math.ceil(licenciasHook.totalCount / pageSize),
      goToPage: (page: number) => {
        setLicenciaPage(page);
      },
      nextPage: () => {
        if (licenciaPage < Math.ceil(licenciasHook.totalCount / pageSize)) {
          setLicenciaPage((p) => p + 1);
        }
      },
      prevPage: () => {
        if (licenciaPage > 1) {
          setLicenciaPage((p) => p - 1);
        }
      },
      mostrarFormulario: licenciaForm.showForm,
      editarId: licenciaForm.editId,
      form: licenciaForm.form,
      tiposDisponibles: tiposLicenciasFiltro,
      abrirCrear: abrirCrearLicencia,
      abrirEditar: abrirEditarLicencia,
      cerrarFormulario: licenciaForm.closeForm,
      actualizarForm: licenciaForm.updateForm,
      enviar: enviarLicencia,
    },

    // Modales
    modales: {
      asignar: {
        visible: assignModal.visible,
        contexto: assignModal.contexto,
        abrir: abrirAsignarModal,
        cerrar: () =>
          setAssignModal((prev) => ({ ...prev, visible: false })),
        actualizar: actualizarAsignacion,
        enviar: enviarAsignacion,
      },
      eliminar: {
        visible: deleteModal.visible,
        contexto: deleteModal.contexto,
        abrir: abrirEliminarModal,
        cerrar: () =>
          setDeleteModal((prev) => ({ ...prev, visible: false })),
        enviar: enviarEliminacion,
      },
      historial: {
        visible: historialModal.visible,
        titulo: historialModal.titulo,
        movimientos: historialModal.movimientos,
        abrir: abrirHistorialModal,
        cerrar: () =>
          setHistorialModal((prev) => ({ ...prev, visible: false })),
      },
    },

    // Refrescar
    refrescar,
  };
}
