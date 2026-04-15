// src/pages/NuevoTicket.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";
import { createTicket } from "../services/tickets";
import { sendTicketEmail } from "../services/email";
import { useCentroUsuarios } from "../features/gestion-activos/hooks/useCentroUsuarios";
import type { TicketPayload } from "../services/tickets";
import AppHeader from "../components/AppHeader";
import {
  obtenerConfiguracionAprobacionPorClave,
  obtenerOpcionesAprobacionUsuario,
} from "../utils/ticketApproval";

// Generador simple de ticketId
function genTicketId() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
    d.getDate(),
  )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TCK-${stamp}-${rand}`;
}

const TITLES: TicketPayload["title"][] = [
  "SAP",
  "Impresoras",
  "Cuentas",
  "Rinde Gastos",
  "Terreno",
  "Otros",
];
const RISKS: TicketPayload["risk"][] = ["alto", "medio", "bajo"];

function nombreVisibleCentroUsuario(usuario: {
  pnombre?: string;
  snombre?: string;
  papellido?: string;
  sapellido?: string;
  usuario?: string;
}) {
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
    "Sin usuario"
  );
}

export default function NuevoTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usuarios: centroUsuarios, loading: centroUsuariosLoading } =
    useCentroUsuarios();
  const currentUserId = useMemo(
    () => (user?.nombreUsuario || user?.usuario || "").trim(),
    [user?.nombreUsuario, user?.usuario],
  );

  // Bloquear acceso a administradores
  useEffect(() => {
    if (isTicketAdmin(user || undefined)) {
      navigate("/menu", { replace: true });
    }
  }, [user, navigate]);

  const [title, setTitle] = useState<TicketPayload["title"] | null>(null);
  const [risk, setRisk] = useState<TicketPayload["risk"]>("bajo");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [requiereAprobacion, setRequiereAprobacion] = useState(false);
  const [areaAprobacionSeleccionada, setAreaAprobacionSeleccionada] =
    useState("");
  const submittingRef = useRef(false);

  const adminEmails = useMemo(() => {
    const emails = new Set<string>();
    (centroUsuarios || []).forEach((u) => {
      const roles = Array.isArray(u.rol) ? u.rol : u.rol ? [u.rol] : [];
      if (!roles.includes("admin")) return;
      const email = (u.email || "").trim();
      if (email) emails.add(email);
    });
    return Array.from(emails);
  }, [centroUsuarios]);

  const opcionesAprobacion = useMemo(
    () => obtenerOpcionesAprobacionUsuario(user || undefined),
    [user],
  );

  const aprobacionDisponible = opcionesAprobacion.length > 0;

  useEffect(() => {
    if (!aprobacionDisponible) {
      setRequiereAprobacion(false);
      setAreaAprobacionSeleccionada("");
      return;
    }

    if (opcionesAprobacion.length === 1) {
      setAreaAprobacionSeleccionada(opcionesAprobacion[0].clave);
      return;
    }

    setAreaAprobacionSeleccionada((actual) => {
      if (actual && opcionesAprobacion.some((item) => item.clave === actual)) {
        return actual;
      }
      return "";
    });
  }, [aprobacionDisponible, opcionesAprobacion]);

  const configuracionAprobacion = useMemo(
    () => obtenerConfiguracionAprobacionPorClave(areaAprobacionSeleccionada),
    [areaAprobacionSeleccionada],
  );

  const aprobadoresActivos = useMemo(() => {
    const rolBuscado = (configuracionAprobacion?.rolAprobador || "")
      .trim()
      .toLowerCase();
    if (!rolBuscado) return [] as { nombre: string; email: string }[];

    const vistos = new Set<string>();
    const items: { nombre: string; email: string }[] = [];

    (centroUsuarios || []).forEach((usuario) => {
      const roles = Array.isArray(usuario.rol)
        ? usuario.rol
        : usuario.rol
          ? [usuario.rol]
          : [];

      const coincide = roles
        .map((rol) => rol.trim().toLowerCase())
        .includes(rolBuscado);

      if (!coincide) return;

      const nombre = nombreVisibleCentroUsuario(usuario);
      const email = (usuario.email || "").trim();
      const clave = [
        (usuario.usuario || "").trim().toLowerCase(),
        email.toLowerCase(),
        nombre,
      ]
        .filter(Boolean)
        .join("|");

      if (!clave || vistos.has(clave)) return;
      vistos.add(clave);
      items.push({ nombre, email });
    });

    return items.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
  }, [centroUsuarios, configuracionAprobacion?.rolAprobador]);

  const correosAprobadores = useMemo(
    () => aprobadoresActivos.map((item) => item.email).filter(Boolean),
    [aprobadoresActivos],
  );

  // Función para comprimir una imagen
  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("El archivo no es una imagen"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Configuración de compresión
          const sizeMb = file.size / (1024 * 1024);
          let maxDim = 1920;
          let quality = 0.88;
          if (sizeMb > 5) {
            maxDim = 1280;
            quality = 0.72;
          } else if (sizeMb > 2) {
            maxDim = 1600;
            quality = 0.8;
          }

          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo el aspect ratio
          if (width > height) {
            if (width > maxDim) {
              height = (height * maxDim) / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = (width * maxDim) / height;
              height = maxDim;
            }
          }

          // Crear canvas para redimensionar
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No se pudo crear el contexto del canvas"));
            return;
          }

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a base64 con compresión
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });
  }

  async function onImageFilesSelected(files: File[]) {
    if (!files.length) return;
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      setError("No se pudieron agregar más imágenes.");
      return;
    }

    const arr = files.slice(0, remainingSlots);
    setCompressing(true);
    setError(null);

    try {
      const compressed = await Promise.all(
        arr.map(async (file) => {
          try {
            return await compressImage(file);
          } catch (err) {
            console.error("Error comprimiendo imagen:", err);
            return "";
          }
        }),
      );

      const validImages = compressed.filter(Boolean);
      if (validImages.length > 0) {
        setImages((current) => [...current, ...validImages]);
      }
      if (validImages.length < arr.length) {
        setError(
          `${arr.length - validImages.length} imagen(es) no pudieron procesarse`,
        );
      }
    } catch (err) {
      setError("Error procesando las imágenes");
    } finally {
      setCompressing(false);
    }
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files) return;
    await onImageFilesSelected(Array.from(files));
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedId(null);
    // Evitar envíos múltiples por doble click o Enter repetido
    if (loading || submittingRef.current) return;

    if (!title || !description.trim()) {
      setError("Selecciona un área (title) y escribe una descripción.");
      return;
    }
    if (!currentUserId) {
      setError("Sesión no válida. Vuelve a iniciar sesión.");
      return;
    }
    if (requiereAprobacion && !configuracionAprobacion) {
      setError("Selecciona el area de aprobacion correspondiente.");
      return;
    }
    if (requiereAprobacion && centroUsuariosLoading) {
      setError(
        "Se estan cargando las jefaturas disponibles. Intenta nuevamente.",
      );
      return;
    }
    if (requiereAprobacion && correosAprobadores.length === 0) {
      setError(
        "No se encontro una jefatura activa para esta aprobacion. Revisa la configuracion de roles.",
      );
      return;
    }

    const ticketId = genTicketId();
    const firstName =
      typeof user?.primerNombre === "string" && user.primerNombre.trim()
        ? user.primerNombre.trim()
        : typeof user?.pnombre === "string"
          ? user.pnombre.trim()
          : "";
    const lastName =
      typeof user?.primerApellido === "string" && user.primerApellido.trim()
        ? user.primerApellido.trim()
        : typeof user?.papellido === "string"
          ? user.papellido.trim()
          : "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    const payload: TicketPayload = {
      ticketId,
      title,
      description: description.trim(),
      userId: currentUserId,
      userName: fullName || firstName || currentUserId,
      userLastName: lastName || undefined,
      userFullName: fullName || undefined,
      risk,
      state: "recibido",
      images: images.length ? images : undefined,
      aprobacionRequerida: requiereAprobacion,
      estadoAprobacion: requiereAprobacion ? "pendiente" : "no_requiere",
      areaAprobacion: configuracionAprobacion?.clave,
      rolSolicitanteAprobacion: configuracionAprobacion?.rolSolicitante,
      rolAprobador: configuracionAprobacion?.rolAprobador,
      fechaSolicitudAprobacion: requiereAprobacion
        ? new Date().toISOString()
        : undefined,
    };

    try {
      submittingRef.current = true;
      setLoading(true);
      const resp = await createTicket(payload);
      if (!resp.ok) throw new Error(resp.error || "Error al crear el ticket");
      setCreatedId(ticketId);
      const destinatarios = requiereAprobacion
        ? correosAprobadores.join(",")
        : adminEmails.join(",");
      if (destinatarios) {
        const aprobadorPrincipal = correosAprobadores[0] || "";
        void sendTicketEmail({
          destinatario: destinatarios,
          asunto: requiereAprobacion
            ? `Solicitud de aprobacion ${ticketId}`
            : `Nuevo ticket ${ticketId}`,
          mensaje: requiereAprobacion
            ? `Se creo un ticket que requiere aprobacion de jefatura para ${configuracionAprobacion?.etiqueta || "el area seleccionada"} por ${payload.userName || payload.userId}.`
            : `Se creó un nuevo ticket en ${title} por ${payload.userName || payload.userId}.`,
          nota: {
            origen: "ticket",
            ticketId,
            title,
            state: payload.state,
            risk: payload.risk,
            userName: payload.userName,
            userId: payload.userId,
            fecha: new Date().toLocaleString("es-CL"),
            description: payload.description,
            aprobacionRequerida: payload.aprobacionRequerida,
            estadoAprobacion: payload.estadoAprobacion,
            areaAprobacion: configuracionAprobacion?.etiqueta,
            rolAprobador: configuracionAprobacion?.rolAprobador,
            correoAprobador: aprobadorPrincipal || undefined,
          },
        });
      }
      // Redirigir a MisTickets tras crear exitosamente
      navigate("/tickets");
    } catch (err: any) {
      // Si hay imágenes y falla la conexión, probablemente es por tamaño
      if (
        images.length > 0 &&
        (err?.message?.includes("conexión") ||
          err?.message?.includes("conectar"))
      ) {
        setError(
          `Las imágenes son demasiado pesadas. Intenta con ${images.length > 2 ? "menos imágenes" : "imágenes más pequeñas"}`,
        );
      } else {
        setError(err?.message || "No se pudo crear el ticket");
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Fondos decorativos */}
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

      <div className="relative w-full max-w-2xl">
        <AppHeader
          title="Crear ticket"
          subtitle="Completa el formulario y guarda tu incidencia"
          backTo="/menu"
        />

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-neutral-200 bg-white/90 p-6 shadow-[0_14px_36px_rgba(15,23,42,0.10)]"
        >
          {/* Categoría */}
          <div className="space-y-2 text-center">
            <label className="text-lg text-neutral-700">
              <strong>Categoría</strong>
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:ring-2 focus:ring-orange-500"
              value={title ?? ""}
              onChange={(e) =>
                setTitle(e.target.value as TicketPayload["title"])
              }
            >
              <option value="" disabled>
                Seleccione una categoría
              </option>
              {TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div className="space-y-2 text-center">
            <label className="text-lg text-neutral-700">
              <strong>Descripción</strong>
            </label>
            <textarea
              rows={4}
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:ring-2 focus:ring-orange-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={(event) => {
                if (compressing) return;
                const clipboardItems = Array.from(
                  event.clipboardData?.items ?? [],
                );
                const clipboardImageFiles = clipboardItems
                  .map((item) =>
                    item.kind === "file" ? item.getAsFile() : null,
                  )
                  .filter((file): file is File => Boolean(file))
                  .filter((file) => file.type.startsWith("image/"));

                const imageFiles =
                  clipboardImageFiles.length > 0
                    ? clipboardImageFiles
                    : Array.from(event.clipboardData?.files ?? []).filter(
                        (file) => file.type.startsWith("image/"),
                      );

                if (!imageFiles.length) return;
                event.preventDefault();
                void onImageFilesSelected(imageFiles);
              }}
              placeholder="Describe el problema o solicitud con el mayor detalle posible."
            />
            <p className="text-xs text-neutral-500">
              Tip: puedes pegar capturas con <kbd>Ctrl</kbd> + <kbd>V</kbd>.
            </p>
          </div>

          {/* Imágenes (opcional) */}
          <div className="space-y-2 text-center">
            <label className="text-lg text-neutral-700">
              <strong>Adjuntar imágenes</strong>
            </label>
            <p className="mt-1 text-xs text-neutral-500">
              Las imágenes se comprimen automáticamente para optimizar el envío
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={compressing}
              onChange={(e) => onFilesSelected(e.target.files)}
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {compressing && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Comprimiendo imágenes...
              </div>
            )}
            {!!images.length && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={src}
                      alt={`adjunto-${i}`}
                      className="h-24 w-full rounded-lg border border-neutral-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg opacity-90 hover:opacity-100 transition"
                      title="Eliminar imagen"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Riesgo */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-700">Riesgo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RISKS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRisk(r)}
                  className={[
                    "rounded-xl border border-neutral-200 bg-white px-4 py-2 text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50",
                    risk === r
                      ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
                      : "",
                  ].join(" ")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {aprobacionDisponible && (
            <div className="space-y-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-fuchsia-800">
                    Aprobacion de jefatura
                  </h3>
                  <p className="mt-1 text-xs text-fuchsia-700">
                    Usa esta opcion cuando el requerimiento necesite visto bueno
                    de jefatura antes de pasar a TI.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm text-neutral-800">
                  <input
                    type="checkbox"
                    checked={requiereAprobacion}
                    onChange={(event) =>
                      setRequiereAprobacion(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-neutral-900 text-fuchsia-500 focus:ring-fuchsia-500"
                  />
                  Requiere aprobacion
                </label>
              </div>

              {requiereAprobacion && (
                <div className="space-y-3">
                  {opcionesAprobacion.length > 1 ? (
                    <label className="block text-sm text-neutral-700">
                      Area solicitante
                      <select
                        value={areaAprobacionSeleccionada}
                        onChange={(event) =>
                          setAreaAprobacionSeleccionada(event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-fuchsia-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:ring-2 focus:ring-fuchsia-500"
                      >
                        <option value="">Selecciona un area</option>
                        {opcionesAprobacion.map((opcion) => (
                          <option key={opcion.clave} value={opcion.clave}>
                            {opcion.etiqueta}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : configuracionAprobacion ? (
                    <div className="rounded-xl border border-fuchsia-200 bg-white px-4 py-3 text-sm text-neutral-900">
                      <div className="text-xs uppercase tracking-wide text-fuchsia-700">
                        Area solicitante
                      </div>
                      <div className="mt-1 font-semibold">
                        {configuracionAprobacion.etiqueta}
                      </div>
                    </div>
                  ) : null}

                  {configuracionAprobacion && (
                    <div className="rounded-xl border border-fuchsia-200 bg-white px-4 py-3 text-sm text-neutral-900">
                      <div className="text-xs uppercase tracking-wide text-fuchsia-700">
                        Jefatura que revisara esta solicitud
                      </div>
                      {aprobadoresActivos.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {aprobadoresActivos.map((aprobador) => (
                            <div
                              key={`${aprobador.nombre}-${aprobador.email}`}
                              className="font-semibold"
                            >
                              {aprobador.nombre}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-2 text-xs text-neutral-500">
                        {aprobadoresActivos.length > 0
                          ? `${correosAprobadores.length} destinatario(s) activos encontrados.`
                          : "Aun no se encontro una jefatura activa con ese rol."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!centroUsuariosLoading && !aprobacionDisponible && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
              Tu usuario no tiene un rol configurado para solicitudes con
              aprobacion de jefatura.
            </div>
          )}

          {/* Mensajes */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {createdId && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Ticket creado: <span className="font-semibold">{createdId}</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                loading || (requiereAprobacion && centroUsuariosLoading)
              }
              className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-orange-500 disabled:opacity-60"
            >
              {loading
                ? "Guardando..."
                : requiereAprobacion && centroUsuariosLoading
                  ? "Cargando jefaturas..."
                  : "Guardar ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
