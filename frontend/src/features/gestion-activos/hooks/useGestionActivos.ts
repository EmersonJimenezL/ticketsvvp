import { useState, useCallback, useMemo, useEffect } from "react";
import { useActivos } from "./useActivos";
import { useLicencias } from "./useLicencias";
import { useActivoForm } from "./useActivoForm";
import { useLicenciaForm } from "./useLicenciaForm";
import { useEspecificaciones } from "./useEspecificaciones";
import { useCentroUsuarios } from "./useCentroUsuarios";
import { validateActivo } from "../validation/activoValidation";
import { validateLicencia } from "../validation/licenciaValidation";
import { useAuth } from "../../../auth/AuthContext";
import type {
  Activo,
  Licencia,
  CentroUsuario,
  ActivoFilters,
  LicenciaFilters,
  AssignContext,
  DeleteContext,
  HistMovimiento,
  TabKey,
} from "../types";
import { API_BASE, OPCIONES_TIPO_LIC_MAP } from "../constants";
import { generateActaEntregaPdf } from "../utils/actaPdf";
import { getUsuarioLabel } from "../utils/usuarios";

function buildUserName(user: any) {
  if (!user) return "";
  const parts = [
    user.pnombre || user.primerNombre,
    user.snombre,
    user.papellido || user.primerApellido,
    user.sapellido,
  ].filter(Boolean);
  return (
    parts.join(" ").trim() ||
    user.nombreUsuario ||
    user.usuario ||
    ""
  );
}

function extractNumeroActaFromResponse(json: any) {
  const direct =
    json?.numeroActa ||
    json?.numeroacta ||
    json?.acta?.numeroActa ||
    json?.acta?.numeroacta ||
    json?.data?.numeroActa ||
    json?.data?.numeroacta;
  if (direct) return String(direct);
  return "";
}

function getNumeroActaList(activo?: Activo | null) {
  if (!activo) return [];
  const arr = (activo as any)?.numeroacta || (activo as any)?.numeroActa;
  return Array.isArray(arr) ? arr : [];
}

function resolveNumeroActa(
  json: any,
  updatedActivo?: Activo | null,
  previousActivo?: Activo | null
) {
  const direct = extractNumeroActaFromResponse(json);
  if (direct) return direct;

  const updatedList = getNumeroActaList(updatedActivo);
  const previousList = getNumeroActaList(previousActivo);

  if (updatedList.length > previousList.length) {
    return String(updatedList[updatedList.length - 1]);
  }

  if (!previousList.length && updatedList.length) {
    return String(updatedList[updatedList.length - 1]);
  }

  return "";
}

function parseDateOrNow(value?: string) {
  if (!value) return new Date();
  const raw = value.includes("T") ? value : `${value}T00:00:00`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

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
  busqueda: "",
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
  const { user } = useAuth();
  const asignadoPor = useMemo(() => buildUserName(user), [user]);
  const { usuarios: centroUsuarios } = useCentroUsuarios();

  const correoPorNombre = useMemo(() => {
    const mapa = new Map<string, string>();
    (centroUsuarios || []).forEach((u: CentroUsuario) => {
      const label = getUsuarioLabel(u);
      if (label && !mapa.has(label) && u.email) {
        mapa.set(label, u.email);
      }
    });
    return mapa;
  }, [centroUsuarios]);

  const resolveCorreo = useCallback(
    (nombre?: string) => {
      if (!nombre) return undefined;
      return correoPorNombre.get(nombre);
    },
    [correoPorNombre]
  );

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
  const pageSize = 10;

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
      titulo: "",
      asignadoPara: "",
      fechaAsignacion: "",
    },
  });

  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    contexto: DeleteContext;
  }>({
    visible: false,
    contexto: { tipo: "activo", id: "", titulo: "" },
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

  // Tipos disponibles de licencias según proveedor (para filtros)
  const tiposLicenciasFiltro = useMemo(() => {
    if (licenciaFilters.proveedor === "SAP") {
      return [...OPCIONES_TIPO_LIC_MAP.SAP];
    }
    if (licenciaFilters.proveedor === "Office") {
      return [...OPCIONES_TIPO_LIC_MAP.Office];
    }
    return [...OPCIONES_TIPO_LIC_MAP.SAP, ...OPCIONES_TIPO_LIC_MAP.Office];
  }, [licenciaFilters.proveedor]);

  // Estado para almacenar todas las licencias (sin paginación)
  const [todasLasLicencias, setTodasLasLicencias] = useState<Licencia[]>([]);

  // Cargar todas las licencias al inicio
  const cargarTodasLasLicencias = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/licencias?limit=1000`);
      const json = await response.json();
      if (json?.ok && Array.isArray(json.data)) {
        setTodasLasLicencias(json.data);
      }
    } catch (err) {
      console.error("Error cargando todas las licencias:", err);
    }
  }, []);

  // Tipos disponibles para el formulario con cantidades
  const tiposDisponiblesConCantidad = useMemo(() => {
    // Obtener proveedor del formulario actual
    const proveedor = licenciaForm.form.proveedor;
    if (!proveedor) return [];

    // Obtener tipos según proveedor
    const tiposPorProveedor = proveedor === "SAP"
      ? [...OPCIONES_TIPO_LIC_MAP.SAP]
      : proveedor === "Office"
      ? [...OPCIONES_TIPO_LIC_MAP.Office]
      : [];

    // Obtener todas las licencias del mismo proveedor
    const licenciasDelProveedor = todasLasLicencias.filter(
      (lic) => lic.proveedor === proveedor
    );

    // Contar disponibles por tipo
    const tiposConCantidad = tiposPorProveedor.map((tipo) => {
      const cantidad = licenciasDelProveedor.filter(
        (lic) => lic.tipoLicencia === tipo && !lic.asignadoPara
      ).length;
      return { tipo, cantidad };
    });

    // En modo edición, incluir el tipo actual aunque no haya disponibles
    if (!licenciaForm.editId) return tiposConCantidad;

    return tiposConCantidad.filter(
      (item) => item.cantidad > 0 || licenciaForm.form.tipoLicencia === item.tipo
    );
  }, [licenciaForm.form.proveedor, licenciaForm.form.tipoLicencia, licenciaForm.editId, todasLasLicencias]);

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
      let savedActivo: Activo | null = null;
      let previousActivo: Activo | null = null;
      if (activoForm.editId) {
        previousActivo =
          activosHook.activos.find(
            (item) => String(item._id) === String(activoForm.editId)
          ) || null;
        savedActivo = await activosHook.updateActivo(
          activoForm.editId,
          activoForm.form
        );
      } else {
        savedActivo = await activosHook.createActivo(activoForm.form);
      }

      if (
        savedActivo &&
        (savedActivo.asignadoPara || activoForm.form.asignadoPara)
      ) {
        const numeroActa = resolveNumeroActa(
          savedActivo,
          savedActivo,
          previousActivo
        );
        const actaExtras = (savedActivo as any)?.acta || {};
        const correo =
          actaExtras.correo ||
          actaExtras.email ||
          actaExtras.mail ||
          actaExtras.correoCorporativo ||
          resolveCorreo(
            savedActivo.asignadoPara || activoForm.form.asignadoPara || ""
          );
        const rut = actaExtras.rut || actaExtras.RUT;
        const spec = specs.find(
          (item) => item.modelo && item.modelo === savedActivo?.modelo
        );

        if (!numeroActa) {
          console.warn("Acta sin numero correlativo para PDF.");
        }
        try {
          await generateActaEntregaPdf({
            numeroActa,
            fecha: parseDateOrNow(savedActivo.fechaAsignacion),
            asignadoPara:
              savedActivo.asignadoPara || activoForm.form.asignadoPara || "",
            asignadoPor,
            rut,
            correo,
            activo: savedActivo,
            spec,
            accesorios: actaExtras.accesorios,
            licenciaOffice: actaExtras.licenciaOffice,
            officeLicencias: actaExtras.officeLicencias,
            sapCuenta: actaExtras.sapCuenta,
            sapBo: actaExtras.sapBo,
          });
        } catch (err) {
          console.error("Error generando acta PDF:", err);
        }
      }

      activoForm.closeForm();
      await cargarActivos();
    } catch (err: any) {
      setGlobalError(err.message || "Error al guardar activo");
    }
  }, [
    activoForm,
    activosHook,
    activosHook.activos,
    cargarActivos,
    specs,
    asignadoPor,
    resolveCorreo,
  ]);

  // Handlers de formularios de licencias
  const abrirCrearLicencia = useCallback(async () => {
    await cargarTodasLasLicencias();
    licenciaForm.openCreate();
  }, [licenciaForm, cargarTodasLasLicencias]);

  const abrirEditarLicencia = useCallback(
    async (licencia: Licencia) => {
      await cargarTodasLasLicencias();
      licenciaForm.openEdit(licencia);
    },
    [licenciaForm, cargarTodasLasLicencias]
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
      await cargarTodasLasLicencias();
    } catch (err: any) {
      setGlobalError(err.message || "Error al guardar licencia");
    }
  }, [licenciaForm, licenciasHook, cargarLicencias, cargarTodasLasLicencias]);

  // Modal de asignación
  const abrirAsignarModal = useCallback(
    (
      tipo: "activo" | "licencia",
      id: string,
      titulo: string,
      asignadoPara: string,
      fechaAsignacion: string
    ) => {
      setAssignModal({
        visible: true,
        contexto: { tipo, id, titulo, asignadoPara, fechaAsignacion },
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
        tipo === "activo" ? `${API_BASE}/activos/${id}` : `${API_BASE}/licencias/${id}`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignadoPara, fechaAsignacion }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Error al asignar");

      if (tipo === "activo" && asignadoPara.trim() !== "") {
        const updatedActivo = json?.data || null;
        const previousActivo =
          activosHook.activos.find((item) => String(item._id) === String(id)) ||
          null;
        const activoForPdf: Activo | null = updatedActivo || previousActivo;
        const numeroActa = resolveNumeroActa(json, updatedActivo, previousActivo);
        const spec = specs.find(
          (item) => item.modelo && item.modelo === activoForPdf?.modelo
        );
        const actaExtras = json?.acta || json?.data?.acta || {};
        const correo =
          actaExtras.correo ||
          actaExtras.email ||
          actaExtras.mail ||
          actaExtras.correoCorporativo ||
          resolveCorreo(asignadoPara);
        const rut = actaExtras.rut || actaExtras.RUT;

        if (!numeroActa) {
          console.warn("Acta sin numero correlativo para PDF.");
        }
        if (activoForPdf) {
          try {
            await generateActaEntregaPdf({
              numeroActa,
              fecha: parseDateOrNow(fechaAsignacion),
              asignadoPara,
              asignadoPor,
              rut,
              correo,
              activo: activoForPdf,
              spec,
              accesorios: actaExtras.accesorios,
              licenciaOffice: actaExtras.licenciaOffice,
              officeLicencias: actaExtras.officeLicencias,
              sapCuenta: actaExtras.sapCuenta,
              sapBo: actaExtras.sapBo,
            });
          } catch (err) {
            console.error("Error generando acta PDF:", err);
          }
        }
      }

      setAssignModal({ visible: false, contexto: assignModal.contexto });
      await refrescar();
      await cargarTodasLasLicencias();
    } catch (err: any) {
      setGlobalError(err.message || "Error al asignar");
    }
  }, [
    assignModal,
    refrescar,
    cargarTodasLasLicencias,
    activosHook.activos,
    specs,
    asignadoPor,
    resolveCorreo,
  ]);

  const descargarActa = useCallback(
    async (activo: Activo) => {
      const actas = getNumeroActaList(activo);
      let numeroActa = actas.length ? String(actas[actas.length - 1]) : "";
      if (actas.length > 1) {
        const seleccion = window.prompt(
          `Actas disponibles: ${actas.join(", ")}\n` +
            "Escribe el numero exacto o deja vacío para usar la última.",
          numeroActa
        );
        if (seleccion && !actas.includes(seleccion)) {
          alert("El numero de acta no existe en este activo.");
          return;
        }
        if (seleccion) {
          numeroActa = seleccion;
        }
      } else if (!actas.length) {
        const confirmPreview = window.confirm(
          "Este activo no tiene actas registradas. ¿Generar vista previa sin correlativo?"
        );
        if (!confirmPreview) return;
      }

      const spec = specs.find(
        (item) => item.modelo && item.modelo === activo?.modelo
      );

      try {
        await generateActaEntregaPdf({
          numeroActa,
          fecha: parseDateOrNow(activo.fechaAsignacion),
          asignadoPara: activo.asignadoPara || "",
          asignadoPor,
          correo: resolveCorreo(activo.asignadoPara),
          activo,
          spec,
        });
      } catch (err) {
        console.error("Error generando acta PDF:", err);
      }
    },
    [specs, asignadoPor, resolveCorreo]
  );

  // Modal de eliminación
  const abrirEliminarModal = useCallback(
    (tipo: "activo" | "licencia", id: string, titulo: string) => {
      setDeleteModal({
        visible: true,
        contexto: { tipo, id, titulo },
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
    async (tipo: "activo" | "licencia", id: string, titulo: string) => {
      setGlobalError(null);
      try {
        const endpoint = `${API_BASE}/historicos/${tipo}/${id}`;
        const response = await fetch(endpoint);
        const json = await response.json();
        if (!json.ok) throw new Error("Error al cargar historial");

        setHistorialModal({
          visible: true,
          titulo: titulo,
          movimientos: json.data?.movimientos || [],
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
    (): [string, number][] => Object.entries(licStats?.porTipo || {}).sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][],
    [licStats]
  );

  const statsPorProveedor = useMemo(
    (): [string, number][] => Object.entries(licStats?.porProveedor || {}).sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][],
    [licStats]
  );

  const statsMaxTipo = useMemo(
    () => (statsPorTipo.length ? (statsPorTipo[0][1] as number) : 0),
    [statsPorTipo]
  );

  const statsMaxProveedor = useMemo(
    () => (statsPorProveedor.length ? (statsPorProveedor[0][1] as number) : 0),
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

    usuarios: centroUsuarios,

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
      descargarActa,
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
      tiposDisponibles: tiposDisponiblesConCantidad,
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
