import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";
import AppHeader from "../components/AppHeader";
import {
  OPCIONES_AREA_CENTRO,
  OPCIONES_CENTRO_COSTO_CENTRO,
  OPCIONES_PERMISOS_APP_STOCK,
  OPCIONES_ROL_CENTRO,
  OPCIONES_SUCURSAL_CENTRO,
  PAGE_SIZE_USUARIOS,
  PASSWORD_MIN_LENGTH,
  ROL_INICIAL_USUARIO,
} from "../features/admin-usuarios/constants";
import type {
  FormularioUsuarioCentro,
  PayloadUsuarioCentro,
  UsuarioCentroAdmin,
} from "../features/admin-usuarios/types";
import { Pagination } from "../features/gestion-activos/components/Pagination";
import {
  actualizarUsuarioCentro,
  cambiarEstadoUsuarioCentro,
  crearUsuarioCentro,
  eliminarUsuarioCentro,
  listarUsuariosCentro,
  obtenerCatalogosCentro,
  restablecerPasswordUsuarioCentro,
  type CatalogosCentroAdmin,
} from "../services/centroUsuariosAdmin";

type EstadoFiltro = "todos" | "activos" | "inactivos";
type ModoFormulario = "crear" | "editar";

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function nombreCompletoUsuario(
  usuario: Pick<
    UsuarioCentroAdmin,
    "pnombre" | "snombre" | "papellido" | "sapellido" | "usuario"
  >
) {
  return (
    [
      usuario.pnombre || "",
      usuario.snombre || "",
      usuario.papellido || "",
      usuario.sapellido || "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    usuario.usuario ||
    "Sin nombre"
  );
}

function formatearFecha(valor?: string) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleString("es-CL");
}

function deduplicarOpciones(valores: readonly string[]) {
  return Array.from(
    new Set(
      valores
        .map((valor) => String(valor || "").trim())
        .filter(Boolean)
    )
  );
}

function resolverOpcionesCatalogo(
  remotas: string[] | undefined,
  fallback: readonly string[],
  extras: readonly string[] = []
) {
  const base = Array.isArray(remotas) && remotas.length ? remotas : fallback;
  return deduplicarOpciones([...base, ...extras]);
}

function crearFormularioInicial(
  rolInicial = ROL_INICIAL_USUARIO
): FormularioUsuarioCentro {
  return {
    usuario: "",
    pnombre: "",
    snombre: "",
    papellido: "",
    sapellido: "",
    email: "",
    sucursal: "",
    area: "",
    centrocosto: "",
    rol: [rolInicial],
    permisos: [],
    permisosAppStock: [],
    activo: true,
    password: "",
    passwordConfirmacion: "",
  };
}

function mapearUsuarioAFormulario(
  usuario: UsuarioCentroAdmin
): FormularioUsuarioCentro {
  return {
    usuario: usuario.usuario || "",
    pnombre: usuario.pnombre || "",
    snombre: usuario.snombre || "",
    papellido: usuario.papellido || "",
    sapellido: usuario.sapellido || "",
    email: usuario.email || "",
    sucursal: usuario.sucursal || "",
    area: usuario.area || "",
    centrocosto: usuario.centrocosto || "",
    rol: Array.isArray(usuario.rol) ? [...usuario.rol] : [],
    permisos: Array.isArray(usuario.permisos) ? [...usuario.permisos] : [],
    permisosAppStock: Array.isArray(usuario.permisosAppStock)
      ? [...usuario.permisosAppStock]
      : [],
    activo: usuario.activo !== false,
    password: "",
    passwordConfirmacion: "",
  };
}

function construirPayloadUsuario(
  formulario: FormularioUsuarioCentro,
  incluirPassword: boolean
): PayloadUsuarioCentro {
  const payload: PayloadUsuarioCentro = {
    usuario: formulario.usuario.trim().toLowerCase(),
    pnombre: formulario.pnombre.trim(),
    snombre: formulario.snombre.trim(),
    papellido: formulario.papellido.trim(),
    sapellido: formulario.sapellido.trim(),
    email: formulario.email.trim().toLowerCase(),
    sucursal: formulario.sucursal,
    area: formulario.area,
    centrocosto: formulario.centrocosto,
    rol: Array.from(
      new Set(formulario.rol.map((item) => item.trim()).filter(Boolean))
    ),
    permisos: Array.from(
      new Set(formulario.permisos.map((item) => item.trim()).filter(Boolean))
    ),
    permisosAppStock: Array.from(
      new Set(
        formulario.permisosAppStock
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ),
    activo: formulario.activo,
  };

  if (incluirPassword) {
    payload.password = formulario.password;
  }

  return payload;
}

function validarFormulario(
  formulario: FormularioUsuarioCentro,
  modo: ModoFormulario
) {
  const errores: Record<string, string> = {};

  if (!formulario.usuario.trim()) {
    errores.usuario = "Debes indicar el nombre de usuario.";
  } else if (formulario.usuario.trim().length < 4) {
    errores.usuario = "El usuario debe tener al menos 4 caracteres.";
  }

  if (!formulario.pnombre.trim()) {
    errores.pnombre = "Debes indicar el primer nombre.";
  }

  if (!formulario.papellido.trim()) {
    errores.papellido = "Debes indicar el apellido.";
  }

  if (!formulario.email.trim()) {
    errores.email = "Debes indicar el correo.";
  } else if (
    !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(formulario.email.trim())
  ) {
    errores.email = "Debes ingresar un correo válido.";
  }

  if (!formulario.sucursal) {
    errores.sucursal = "Debes seleccionar la sucursal.";
  }

  if (!formulario.area) {
    errores.area = "Debes seleccionar el área.";
  }

  if (!formulario.centrocosto) {
    errores.centrocosto = "Debes seleccionar el centro de costo.";
  }

  if (!formulario.rol.length) {
    errores.rol = "Debes seleccionar al menos un rol.";
  }

  if (modo === "crear") {
    if (!formulario.password) {
      errores.password = "Debes definir una contraseña.";
    } else if (formulario.password.length < PASSWORD_MIN_LENGTH) {
      errores.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }

    if (!formulario.passwordConfirmacion) {
      errores.passwordConfirmacion = "Debes confirmar la contraseña.";
    } else if (formulario.password !== formulario.passwordConfirmacion) {
      errores.passwordConfirmacion = "La confirmación no coincide.";
    }
  }

  return errores;
}

function alternarValor(lista: string[], valor: string) {
  return lista.includes(valor)
    ? lista.filter((item) => item !== valor)
    : [...lista, valor];
}

function resumenRoles(roles: string[]) {
  if (!roles.length) return "Sin roles";
  if (roles.length <= 2) return roles.join(", ");
  return `${roles.slice(0, 2).join(", ")} y ${roles.length - 2} más`;
}

function colorEstadoActivo(activo: boolean) {
  return activo
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-neutral-200 bg-neutral-100 text-neutral-600";
}

function ModalBase({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = "max-w-4xl",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 px-4 py-6 backdrop-blur-sm">
      <div
        className={`w-full ${maxWidth} overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.18)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50"
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm text-neutral-700">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-orange-500 ${
          error ? "border-red-300 bg-red-50" : "border-neutral-200 bg-white"
        } ${disabled ? "cursor-not-allowed bg-neutral-100 text-neutral-500" : ""}`}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : null}
    </label>
  );
}

function CampoSelect({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  error?: string;
}) {
  return (
    <label className="block text-sm text-neutral-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-orange-500 ${
          error ? "border-red-300 bg-red-50" : "border-neutral-200 bg-white"
        }`}
      >
        <option value="">Selecciona una opción</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : null}
    </label>
  );
}

function GrupoSeleccion({
  title,
  options,
  selected,
  onToggle,
  helper,
  error,
}: {
  title: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  helper?: string;
  error?: string;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-neutral-800">{title}</div>
      {helper ? <p className="mt-1 text-xs text-neutral-500">{helper}</p> : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const activo = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                activo
                  ? "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-orange-200 hover:bg-orange-50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {error ? (
        <span className="mt-2 block text-xs text-red-600">{error}</span>
      ) : null}
    </div>
  );
}

function EditorPermisos({
  permisos,
  nuevoPermiso,
  onNuevoPermisoChange,
  onAgregarPermiso,
  onEliminarPermiso,
}: {
  permisos: string[];
  nuevoPermiso: string;
  onNuevoPermisoChange: (value: string) => void;
  onAgregarPermiso: () => void;
  onEliminarPermiso: (permiso: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-neutral-800">Permisos</div>
      <p className="mt-1 text-xs text-neutral-500">
        Agrega permisos generales manualmente. Si un permiso no aplica,
        simplemente no lo agregues.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={nuevoPermiso}
          onChange={(event) => onNuevoPermisoChange(event.target.value)}
          placeholder="Ejemplo: reportes, clientes, aprobaciones"
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          type="button"
          onClick={onAgregarPermiso}
          className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
        >
          Agregar permiso
        </button>
      </div>
      {permisos.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {permisos.map((permiso) => (
            <button
              key={permiso}
              type="button"
              onClick={() => onEliminarPermiso(permiso)}
              className="rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs text-neutral-700 transition hover:bg-neutral-200"
            >
              {permiso}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-neutral-400">Sin permisos definidos.</p>
      )}
    </div>
  );
}

export default function AdminUsuarios() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UsuarioCentroAdmin[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosCentroAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todos");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalFormularioAbierto, setModalFormularioAbierto] = useState(false);
  const [modoFormulario, setModoFormulario] = useState<ModoFormulario>("crear");
  const [formulario, setFormulario] = useState<FormularioUsuarioCentro>(
    crearFormularioInicial()
  );
  const [usuarioEditando, setUsuarioEditando] =
    useState<UsuarioCentroAdmin | null>(null);
  const [erroresFormulario, setErroresFormulario] = useState<
    Record<string, string>
  >({});
  const [nuevoPermiso, setNuevoPermiso] = useState("");
  const [guardandoFormulario, setGuardandoFormulario] = useState(false);
  const [usuarioPassword, setUsuarioPassword] =
    useState<UsuarioCentroAdmin | null>(null);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [usuarioEliminar, setUsuarioEliminar] =
    useState<UsuarioCentroAdmin | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [procesandoEstadoId, setProcesandoEstadoId] = useState<string | null>(
    null
  );

  const busquedaDiferida = useDeferredValue(busqueda);

  useEffect(() => {
    if (!isTicketAdmin(user || undefined)) {
      navigate("/menu", { replace: true });
    }
  }, [navigate, user]);

  const cargarUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await listarUsuariosCentro(token);
      setUsuarios(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar la lista de usuarios."
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  const cargarCatalogos = useCallback(async () => {
    try {
      const data = await obtenerCatalogosCentro(token);
      setCatalogos(data);
    } catch {
      // Fallback silencioso: si la ruta aún no existe o falla, el módulo sigue
      // operando con los catálogos locales actuales.
      setCatalogos(null);
    }
  }, [token]);

  useEffect(() => {
    void cargarUsuarios();
  }, [cargarUsuarios]);

  useEffect(() => {
    void cargarCatalogos();
  }, [cargarCatalogos]);

  const opcionesSucursal = useMemo(
    () =>
      resolverOpcionesCatalogo(
        catalogos?.sucursales,
        OPCIONES_SUCURSAL_CENTRO,
        [formulario.sucursal]
      ),
    [catalogos?.sucursales, formulario.sucursal]
  );

  const opcionesArea = useMemo(
    () =>
      resolverOpcionesCatalogo(catalogos?.areas, OPCIONES_AREA_CENTRO, [
        filtroArea,
        formulario.area,
      ]),
    [catalogos?.areas, filtroArea, formulario.area]
  );

  const opcionesCentroCosto = useMemo(
    () =>
      resolverOpcionesCatalogo(
        catalogos?.centrosCosto,
        OPCIONES_CENTRO_COSTO_CENTRO,
        [formulario.centrocosto]
      ),
    [catalogos?.centrosCosto, formulario.centrocosto]
  );

  const opcionesRol = useMemo(
    () =>
      resolverOpcionesCatalogo(catalogos?.roles, OPCIONES_ROL_CENTRO, [
        filtroRol,
        ...formulario.rol,
      ]),
    [catalogos?.roles, filtroRol, formulario.rol]
  );

  const opcionesPermisosAppStock = useMemo(
    () =>
      resolverOpcionesCatalogo(
        catalogos?.permisosAppStock,
        OPCIONES_PERMISOS_APP_STOCK,
        formulario.permisosAppStock
      ),
    [catalogos?.permisosAppStock, formulario.permisosAppStock]
  );

  const rolInicialFormulario = useMemo(() => {
    if (opcionesRol.includes(ROL_INICIAL_USUARIO)) {
      return ROL_INICIAL_USUARIO;
    }

    return opcionesRol[0] || ROL_INICIAL_USUARIO;
  }, [opcionesRol]);

  const usuariosFiltrados = useMemo(() => {
    const query = normalizarTexto(busquedaDiferida);

    // El filtrado vive en frontend porque el backend actual del Centro aún
    // no expone una búsqueda administrativa especializada.
    return usuarios.filter((usuario) => {
      if (filtroEstado === "activos" && usuario.activo === false) return false;
      if (filtroEstado === "inactivos" && usuario.activo !== false) return false;
      if (filtroArea && usuario.area !== filtroArea) return false;
      if (filtroRol && !usuario.rol.includes(filtroRol)) return false;

      if (!query) return true;

      const haystack = normalizarTexto(
        [
          usuario.usuario,
          nombreCompletoUsuario(usuario),
          usuario.email,
          usuario.sucursal,
          usuario.area,
          usuario.centrocosto,
          usuario.rol.join(" "),
          (usuario.permisos || []).join(" "),
        ].join(" ")
      );

      return haystack.includes(query);
    });
  }, [busquedaDiferida, filtroArea, filtroEstado, filtroRol, usuarios]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / PAGE_SIZE_USUARIOS)
  );
  const paginaVisible = Math.min(paginaActual, totalPaginas);

  const usuariosPagina = useMemo(() => {
    const desde = (paginaVisible - 1) * PAGE_SIZE_USUARIOS;
    return usuariosFiltrados.slice(desde, desde + PAGE_SIZE_USUARIOS);
  }, [paginaVisible, usuariosFiltrados]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaDiferida, filtroEstado, filtroArea, filtroRol]);

  useEffect(() => {
    setPaginaActual((actual) => Math.min(actual, totalPaginas));
  }, [totalPaginas]);

  const resumen = useMemo(() => {
    const activos = usuarios.filter((item) => item.activo !== false).length;
    const inactivos = usuarios.length - activos;
    const administradores = usuarios.filter((item) =>
      item.rol.includes("admin")
    ).length;

    return {
      total: usuarios.length,
      activos,
      inactivos,
      administradores,
    };
  }, [usuarios]);

  const abrirCrearUsuario = () => {
    setModoFormulario("crear");
    setUsuarioEditando(null);
    setFormulario(crearFormularioInicial(rolInicialFormulario));
    setErroresFormulario({});
    setNuevoPermiso("");
    setModalFormularioAbierto(true);
  };

  const abrirEditarUsuario = (usuario: UsuarioCentroAdmin) => {
    setModoFormulario("editar");
    setUsuarioEditando(usuario);
    setFormulario(mapearUsuarioAFormulario(usuario));
    setErroresFormulario({});
    setNuevoPermiso("");
    setModalFormularioAbierto(true);
  };

  const cerrarFormulario = () => {
    if (guardandoFormulario) return;
    setModalFormularioAbierto(false);
    setErroresFormulario({});
    setNuevoPermiso("");
  };

  const guardarUsuario = async () => {
    const validacion = validarFormulario(formulario, modoFormulario);
    setErroresFormulario(validacion);
    if (Object.keys(validacion).length > 0) return;

    try {
      setGuardandoFormulario(true);
      setError(null);
      const payload = construirPayloadUsuario(
        formulario,
        modoFormulario === "crear"
      );

      let actualizado: UsuarioCentroAdmin;
      if (modoFormulario === "crear") {
        actualizado = await crearUsuarioCentro(payload, token);
        setUsuarios((actual) => [actualizado, ...actual]);
      } else if (usuarioEditando?._id) {
        actualizado = await actualizarUsuarioCentro(
          usuarioEditando._id,
          payload,
          token
        );
        setUsuarios((actual) =>
          actual.map((item) =>
            item._id === usuarioEditando._id ? actualizado : item
          )
        );
      } else {
        throw new Error("No se encontró el usuario a editar.");
      }

      setModalFormularioAbierto(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el usuario."
      );
    } finally {
      setGuardandoFormulario(false);
    }
  };

  const cambiarEstado = async (usuario: UsuarioCentroAdmin, activo: boolean) => {
    try {
      setProcesandoEstadoId(usuario._id);
      setError(null);
      const actualizado = await cambiarEstadoUsuarioCentro(
        usuario._id,
        activo,
        token
      );
      setUsuarios((actual) =>
        actual.map((item) => (item._id === usuario._id ? actualizado : item))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el estado."
      );
    } finally {
      setProcesandoEstadoId(null);
    }
  };

  const abrirModalPassword = (usuario: UsuarioCentroAdmin) => {
    setUsuarioPassword(usuario);
    setPasswordNueva("");
    setPasswordConfirmacion("");
    setErrorPassword(null);
    setModalPasswordAbierto(true);
  };

  const guardarPassword = async () => {
    if (!usuarioPassword?._id) return;

    if (!passwordNueva.trim()) {
      setErrorPassword("Debes ingresar la nueva contraseña.");
      return;
    }
    if (passwordNueva.trim().length < PASSWORD_MIN_LENGTH) {
      setErrorPassword(
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
      );
      return;
    }
    if (passwordNueva !== passwordConfirmacion) {
      setErrorPassword("La confirmación no coincide.");
      return;
    }

    try {
      setGuardandoPassword(true);
      setErrorPassword(null);
      await restablecerPasswordUsuarioCentro(
        usuarioPassword._id,
        passwordNueva.trim(),
        token
      );
      setModalPasswordAbierto(false);
    } catch (err) {
      setErrorPassword(
        err instanceof Error
          ? err.message
          : "No se pudo restablecer la contraseña."
      );
    } finally {
      setGuardandoPassword(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!usuarioEliminar?._id) return;

    try {
      setEliminando(true);
      setError(null);
      await eliminarUsuarioCentro(usuarioEliminar._id, token);
      setUsuarios((actual) =>
        actual.filter((item) => item._id !== usuarioEliminar._id)
      );
      setUsuarioEliminar(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el usuario."
      );
    } finally {
      setEliminando(false);
    }
  };

  const agregarPermisoFormulario = () => {
    const permiso = nuevoPermiso.trim();
    if (!permiso) return;
    setFormulario((actual) => ({
      ...actual,
      permisos: actual.permisos.includes(permiso)
        ? actual.permisos
        : [...actual.permisos, permiso],
    }));
    setNuevoPermiso("");
  };

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-neutral-900">
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

      <div className="relative mx-auto max-w-7xl">
        <AppHeader
          title="Administración de usuarios"
          subtitle="Gestiona altas, edición, estado, roles, permisos y contraseñas del Centro de Aplicaciones"
          backTo="/admin"
        />

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Total
              </div>
              <div className="mt-2 text-2xl font-bold text-neutral-900">
                {resumen.total}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Activos
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                {resumen.activos}
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Inactivos
              </div>
              <div className="mt-2 text-2xl font-bold text-neutral-700">
                {resumen.inactivos}
              </div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Administradores
              </div>
              <div className="mt-2 text-2xl font-bold text-orange-700">
                {resumen.administradores}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            <button
              type="button"
              onClick={() => void cargarUsuarios()}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50"
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={abrirCrearUsuario}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Crear usuario
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CampoTexto
              label="Buscar"
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Nombre, usuario, correo o rol"
            />

            <label className="block text-sm text-neutral-700">
              Estado
              <select
                value={filtroEstado}
                onChange={(event) =>
                  setFiltroEstado(event.target.value as EstadoFiltro)
                }
                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </label>

            <CampoSelect
              label="Área"
              value={filtroArea}
              onChange={setFiltroArea}
              options={opcionesArea}
            />

            <CampoSelect
              label="Rol"
              value={filtroRol}
              onChange={setFiltroRol}
              options={opcionesRol}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-sm font-semibold text-neutral-700">
              Usuarios ({usuariosFiltrados.length})
            </div>
          </div>

          {cargando ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              Cargando usuarios...
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              No hay usuarios para mostrar.
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-200 lg:hidden">
                {usuariosPagina.map((usuario) => (
                  <article key={usuario._id} className="space-y-3 px-4 py-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-neutral-900">
                          {nombreCompletoUsuario(usuario)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          @{usuario.usuario}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${colorEstadoActivo(
                          usuario.activo
                        )}`}
                      >
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div className="text-neutral-700">{usuario.email}</div>
                    <div className="text-xs text-neutral-500">
                      {usuario.area} · {usuario.sucursal}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Roles: {resumenRoles(usuario.rol)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => abrirEditarUsuario(usuario)}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void cambiarEstado(usuario, usuario.activo === false)
                        }
                        disabled={procesandoEstadoId === usuario._id}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50 disabled:opacity-60"
                      >
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirModalPassword(usuario)}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50"
                      >
                        Contraseña
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsuarioEliminar(usuario)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-sm text-neutral-900">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Correo
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Área
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Roles
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Actualizado
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosPagina.map((usuario) => (
                      <tr
                        key={usuario._id}
                        className="border-t border-neutral-200 odd:bg-neutral-50/60"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">
                            {nombreCompletoUsuario(usuario)}
                          </div>
                          <div className="text-xs text-neutral-500">
                            @{usuario.usuario}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {usuario.email}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          <div>{usuario.area}</div>
                          <div className="text-xs text-neutral-500">
                            {usuario.sucursal}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {resumenRoles(usuario.rol)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${colorEstadoActivo(
                              usuario.activo
                            )}`}
                          >
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {formatearFecha(usuario.updatedAt || usuario.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => abrirEditarUsuario(usuario)}
                              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void cambiarEstado(
                                  usuario,
                                  usuario.activo === false
                                )
                              }
                              disabled={procesandoEstadoId === usuario._id}
                              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50 disabled:opacity-60"
                            >
                              {usuario.activo ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirModalPassword(usuario)}
                              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50"
                            >
                              Contraseña
                            </button>
                            <button
                              type="button"
                              onClick={() => setUsuarioEliminar(usuario)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-neutral-200 px-4 py-4">
                <Pagination
                  currentPage={paginaVisible}
                  totalPages={totalPaginas}
                  onPageChange={setPaginaActual}
                  hasNextPage={paginaVisible < totalPaginas}
                  hasPrevPage={paginaVisible > 1}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ModalBase
        open={modalFormularioAbierto}
        onClose={cerrarFormulario}
        title={modoFormulario === "crear" ? "Crear usuario" : "Editar usuario"}
        subtitle={
          modoFormulario === "crear"
            ? "Completa los datos base del usuario y asigna sus accesos."
            : "Actualiza datos, roles y permisos del usuario seleccionado."
        }
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CampoTexto
              label="Usuario"
              value={formulario.usuario}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, usuario: value }))
              }
              error={erroresFormulario.usuario}
            />
            <CampoTexto
              label="Primer nombre"
              value={formulario.pnombre}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, pnombre: value }))
              }
              error={erroresFormulario.pnombre}
            />
            <CampoTexto
              label="Segundo nombre"
              value={formulario.snombre}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, snombre: value }))
              }
            />
            <CampoTexto
              label="Primer apellido"
              value={formulario.papellido}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, papellido: value }))
              }
              error={erroresFormulario.papellido}
            />
            <CampoTexto
              label="Segundo apellido"
              value={formulario.sapellido}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, sapellido: value }))
              }
            />
            <CampoTexto
              label="Correo"
              type="email"
              value={formulario.email}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, email: value }))
              }
              error={erroresFormulario.email}
            />
            <CampoSelect
              label="Sucursal"
              value={formulario.sucursal}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, sucursal: value }))
              }
              options={opcionesSucursal}
              error={erroresFormulario.sucursal}
            />
            <CampoSelect
              label="Área"
              value={formulario.area}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, area: value }))
              }
              options={opcionesArea}
              error={erroresFormulario.area}
            />
            <CampoSelect
              label="Centro de costo"
              value={formulario.centrocosto}
              onChange={(value) =>
                setFormulario((actual) => ({ ...actual, centrocosto: value }))
              }
              options={opcionesCentroCosto}
              error={erroresFormulario.centrocosto}
            />
          </div>

          {modoFormulario === "crear" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <CampoTexto
                label="Contraseña"
                type="password"
                value={formulario.password}
                onChange={(value) =>
                  setFormulario((actual) => ({ ...actual, password: value }))
                }
                error={erroresFormulario.password}
              />
              <CampoTexto
                label="Confirmar contraseña"
                type="password"
                value={formulario.passwordConfirmacion}
                onChange={(value) =>
                  setFormulario((actual) => ({
                    ...actual,
                    passwordConfirmacion: value,
                  }))
                }
                error={erroresFormulario.passwordConfirmacion}
              />
            </div>
          ) : null}

          <GrupoSeleccion
            title="Roles"
            options={opcionesRol}
            selected={formulario.rol}
            onToggle={(value) =>
              setFormulario((actual) => ({
                ...actual,
                rol: alternarValor(actual.rol, value),
              }))
            }
            helper="Selecciona uno o más roles para este usuario."
            error={erroresFormulario.rol}
          />

          <EditorPermisos
            permisos={formulario.permisos}
            nuevoPermiso={nuevoPermiso}
            onNuevoPermisoChange={setNuevoPermiso}
            onAgregarPermiso={agregarPermisoFormulario}
            onEliminarPermiso={(permiso) =>
              setFormulario((actual) => ({
                ...actual,
                permisos: actual.permisos.filter((item) => item !== permiso),
              }))
            }
          />

          <GrupoSeleccion
            title="Permisos App Stock"
            options={opcionesPermisosAppStock}
            selected={formulario.permisosAppStock}
            onToggle={(value) =>
              setFormulario((actual) => ({
                ...actual,
                permisosAppStock: alternarValor(actual.permisosAppStock, value),
              }))
            }
            helper="Permisos específicos utilizados por el módulo de stock."
          />

          <label className="inline-flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={formulario.activo}
              onChange={(event) =>
                setFormulario((actual) => ({
                  ...actual,
                  activo: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
            />
            Usuario activo
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={cerrarFormulario}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void guardarUsuario()}
              disabled={guardandoFormulario}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60"
            >
              {guardandoFormulario ? "Guardando..." : "Guardar usuario"}
            </button>
          </div>
        </div>
      </ModalBase>

      <ModalBase
        open={modalPasswordAbierto}
        onClose={() => {
          if (guardandoPassword) return;
          setModalPasswordAbierto(false);
          setErrorPassword(null);
        }}
        title="Restablecer contraseña"
        subtitle={
          usuarioPassword
            ? `Define una nueva contraseña para @${usuarioPassword.usuario}.`
            : undefined
        }
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <CampoTexto
            label="Nueva contraseña"
            type="password"
            value={passwordNueva}
            onChange={setPasswordNueva}
          />
          <CampoTexto
            label="Confirmar contraseña"
            type="password"
            value={passwordConfirmacion}
            onChange={setPasswordConfirmacion}
          />
          {errorPassword ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorPassword}
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={() => setModalPasswordAbierto(false)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void guardarPassword()}
              disabled={guardandoPassword}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60"
            >
              {guardandoPassword ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </div>
        </div>
      </ModalBase>

      <ModalBase
        open={Boolean(usuarioEliminar)}
        onClose={() => {
          if (eliminando) return;
          setUsuarioEliminar(null);
        }}
        title="Eliminar usuario"
        subtitle={
          usuarioEliminar
            ? `Se eliminará el usuario @${usuarioEliminar.usuario}. Esta acción no se puede deshacer.`
            : undefined
        }
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Confirma cuidadosamente esta acción antes de continuar.
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={() => setUsuarioEliminar(null)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmarEliminacion()}
              disabled={eliminando}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {eliminando ? "Eliminando..." : "Eliminar usuario"}
            </button>
          </div>
        </div>
      </ModalBase>
    </div>
  );
}
