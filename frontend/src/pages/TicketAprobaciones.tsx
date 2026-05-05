import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";
import { useCentroUsuarios } from "../features/gestion-activos/hooks/useCentroUsuarios";
import { Pagination } from "../features/gestion-activos/components/Pagination";
import { sendTicketEmail } from "../services/email";
import {
  listTicketsPaginated,
  resolverAprobacionTicket,
  type Ticket,
} from "../services/tickets";
import {
  buscarUsuarioPorCuenta,
  obtenerClasesEstadoAprobacion,
  obtenerEtiquetaEstadoAprobacion,
  obtenerOpcionesRevisionUsuario,
  ticketCoincideConAprobador,
} from "../utils/ticketApproval";

const PAGE_SIZE = 8;

function formatearFecha(valor?: string) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleString("es-CL");
}

function nombreVisibleUsuario(ticket: Ticket) {
  const completo = (ticket.userFullName || "").trim();
  if (completo) return completo;
  return [ticket.userName || "", ticket.userLastName || ""]
    .filter(Boolean)
    .join(" ")
    .trim() || ticket.userId;
}

export default function TicketAprobaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usuarios: centroUsuarios, loading: centroUsuariosLoading } =
    useCentroUsuarios();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [conteoPendientes, setConteoPendientes] = useState(0);
  const [conteoAprobadas, setConteoAprobadas] = useState(0);
  const [conteoRechazadas, setConteoRechazadas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<"pendientes" | "gestionadas">("pendientes");
  const [filtroArea, setFiltroArea] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<Record<string, boolean>>({});
  const enProceso = useRef<Set<string>>(new Set());

  const opcionesRevision = useMemo(
    () => obtenerOpcionesRevisionUsuario(user || undefined),
    [user]
  );

  const rolesAprobadores = useMemo(
    () => opcionesRevision.map((opcion) => opcion.rolAprobador),
    [opcionesRevision]
  );

  const destinoVolver = isTicketAdmin(user || undefined) ? "/admin" : "/menu";
  const usuarioActual = useMemo(
    () => (user?.nombreUsuario || user?.usuario || "").trim(),
    [user?.nombreUsuario, user?.usuario]
  );
  const nombreActual = useMemo(
    () =>
      [user?.primerNombre || user?.pnombre || "", user?.primerApellido || user?.papellido || ""]
        .filter(Boolean)
        .join(" ")
        .trim() || usuarioActual,
    [user?.papellido, user?.pnombre, user?.primerApellido, user?.primerNombre, usuarioActual]
  );

  const adminEmails = useMemo(() => {
    const emails = new Set<string>();
    centroUsuarios.forEach((item) => {
      const roles = Array.isArray(item.rol) ? item.rol : [];
      if (!roles.map((rol) => rol.trim().toLowerCase()).includes("admin")) return;
      const email = (item.email || "").trim();
      if (email) emails.add(email);
    });
    return Array.from(emails);
  }, [centroUsuarios]);

  useEffect(() => {
    if (opcionesRevision.length > 0) return;
    navigate(destinoVolver, { replace: true });
  }, [destinoVolver, navigate, opcionesRevision.length]);

  useEffect(() => {
    if (opcionesRevision.length === 1) {
      setFiltroArea(opcionesRevision[0].clave);
    }
  }, [opcionesRevision]);

  const cargarTickets = useCallback(async () => {
    if (rolesAprobadores.length === 0) {
      setTickets([]);
      setTotalTickets(0);
      setConteoPendientes(0);
      setConteoAprobadas(0);
      setConteoRechazadas(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const skip = (paginaActual - 1) * PAGE_SIZE;
      const estadosVista =
        vista === "pendientes"
          ? (["pendiente"] as const)
          : (["aprobado", "rechazado"] as const);

      const [paginaResponse, pendientesResponse, aprobadasResponse, rechazadasResponse] =
        await Promise.all([
          listTicketsPaginated({
            limit: PAGE_SIZE,
            skip,
            sortBy: "createdDesc",
            aprobacionRequerida: true,
            rolAprobadores: rolesAprobadores,
            areaAprobacion: filtroArea || undefined,
            estadosAprobacion: [...estadosVista],
          }),
          listTicketsPaginated({
            limit: 1,
            skip: 0,
            aprobacionRequerida: true,
            rolAprobadores: rolesAprobadores,
            areaAprobacion: filtroArea || undefined,
            estadoAprobacion: "pendiente",
          }),
          listTicketsPaginated({
            limit: 1,
            skip: 0,
            aprobacionRequerida: true,
            rolAprobadores: rolesAprobadores,
            areaAprobacion: filtroArea || undefined,
            estadoAprobacion: "aprobado",
          }),
          listTicketsPaginated({
            limit: 1,
            skip: 0,
            aprobacionRequerida: true,
            rolAprobadores: rolesAprobadores,
            areaAprobacion: filtroArea || undefined,
            estadoAprobacion: "rechazado",
          }),
        ]);

      if (!paginaResponse.ok) {
        throw new Error(
          paginaResponse.error || "No se pudieron cargar solicitudes."
        );
      }

      const respuestasConteo = [
        pendientesResponse,
        aprobadasResponse,
        rechazadasResponse,
      ];
      const respuestaConteoConError = respuestasConteo.find(
        (respuesta) => !respuesta.ok
      );
      if (respuestaConteoConError) {
        throw new Error(
          respuestaConteoConError.error ||
            "No se pudieron cargar los conteos de aprobacion."
        );
      }

      setTickets(Array.isArray(paginaResponse.data) ? paginaResponse.data : []);
      setTotalTickets(paginaResponse.count || 0);
      setConteoPendientes(pendientesResponse.count || 0);
      setConteoAprobadas(aprobadasResponse.count || 0);
      setConteoRechazadas(rechazadasResponse.count || 0);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar las aprobaciones.");
    } finally {
      setLoading(false);
    }
  }, [filtroArea, paginaActual, rolesAprobadores, vista]);

  useEffect(() => {
    void cargarTickets();
  }, [cargarTickets]);

  useEffect(() => {
    setPaginaActual(1);
  }, [vista, filtroArea]);

  const ticketsPagina = useMemo(
    () =>
      tickets.filter((ticket) =>
        ticketCoincideConAprobador(ticket, rolesAprobadores)
      ),
    [rolesAprobadores, tickets]
  );

  const totalPaginas = Math.max(1, Math.ceil(totalTickets / PAGE_SIZE));

  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  const enviarNotificacionDecision = useCallback(
    async (ticket: Ticket, decision: "approve" | "reject", comentario?: string) => {
      const usuarioSolicitante = buscarUsuarioPorCuenta(centroUsuarios, ticket.userId);
      const correoSolicitante = (usuarioSolicitante?.email || "").trim();
      const fecha = new Date().toLocaleString("es-CL");

      if (correoSolicitante) {
        await sendTicketEmail({
          destinatario: correoSolicitante,
          asunto:
            decision === "approve"
              ? `Solicitud aprobada ${ticket.ticketId}`
              : `Solicitud rechazada ${ticket.ticketId}`,
          mensaje:
            decision === "approve"
              ? `La jefatura aprobo tu solicitud ${ticket.ticketId}. El ticket ya fue derivado a TI.`
              : `La jefatura rechazo tu solicitud ${ticket.ticketId}. Revisa el motivo en la aplicacion.`,
          nota: {
            origen: "ticket",
            ticketId: ticket.ticketId,
            title: ticket.title,
            state: ticket.state,
            risk: ticket.risk,
            userId: ticket.userId,
            userName: nombreVisibleUsuario(ticket),
            description: ticket.description,
            fecha,
            estadoAprobacion: decision === "approve" ? "aprobado" : "rechazado",
            comentarioAprobacion: comentario || undefined,
            nombreResolvioAprobacion: nombreActual,
          },
        });
      }

      if (decision === "approve" && adminEmails.length > 0) {
        await sendTicketEmail({
          destinatario: adminEmails.join(","),
          asunto: `Ticket aprobado ${ticket.ticketId}`,
          mensaje: `La jefatura aprobo el ticket ${ticket.ticketId}. Ya puede ser gestionado por TI.`,
          nota: {
            origen: "ticket",
            ticketId: ticket.ticketId,
            title: ticket.title,
            state: ticket.state,
            risk: ticket.risk,
            userId: ticket.userId,
            userName: nombreVisibleUsuario(ticket),
            description: ticket.description,
            fecha,
            estadoAprobacion: "aprobado",
            nombreResolvioAprobacion: nombreActual,
          },
        });
      }
    },
    [adminEmails, centroUsuarios, nombreActual]
  );

  const resolverTicket = useCallback(
    async (ticket: Ticket, decision: "approve" | "reject") => {
      if (enProceso.current.has(ticket.ticketId)) return;

      const comentario = (comentarios[ticket.ticketId] || "").trim();
      if (decision === "reject" && !comentario) {
        throw new Error("Debes indicar el motivo del rechazo.");
      }
      if (centroUsuariosLoading) {
        throw new Error(
          "Aun se estan cargando los destinatarios del correo. Intenta nuevamente."
        );
      }

      enProceso.current.add(ticket.ticketId);
      setGuardando((actual) => ({ ...actual, [ticket.ticketId]: true }));
      setError(null);

      try {
        const response = await resolverAprobacionTicket(ticket.ticketId, {
          decision,
          comentario: comentario || undefined,
          usuarioResolvioAprobacion: usuarioActual,
          nombreResolvioAprobacion: nombreActual,
        });

        if (!response.ok) {
          throw new Error(response.error || "No se pudo registrar la decision.");
        }

        setTickets((actual) =>
          actual.filter((item) => item.ticketId !== ticket.ticketId)
        );
        setConteoPendientes((n) => Math.max(0, n - 1));
        if (decision === "approve") setConteoAprobadas((n) => n + 1);
        else setConteoRechazadas((n) => n + 1);

        setComentarios((actual) => {
          const siguiente = { ...actual };
          delete siguiente[ticket.ticketId];
          return siguiente;
        });
        try {
          await enviarNotificacionDecision(ticket, decision, comentario || undefined);
        } catch (mailError) {
          console.warn("[aprobacion] no se pudo enviar correo:", mailError);
        }
      } finally {
        enProceso.current.delete(ticket.ticketId);
        setGuardando((actual) => ({ ...actual, [ticket.ticketId]: false }));
      }
    },
    [centroUsuariosLoading, comentarios, enviarNotificacionDecision, nombreActual, usuarioActual]
  );

  return (
    <div className="min-h-screen bg-white text-neutral-900 relative overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #f97316 0%, transparent 60%)" }}
        />
        <div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #ea580c 0%, transparent 65%)" }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-screen-2xl">
        <AppHeader
          title="Solicitudes por aprobar"
          subtitle="Revisa, aprueba o rechaza requerimientos que necesitan visto bueno"
          backTo={destinoVolver}
        />

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Resumen
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3">
                <div className="text-xs text-neutral-500">Pendientes</div>
                <div className="mt-1 text-2xl font-bold text-fuchsia-700">
                  {conteoPendientes}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs text-neutral-500">Aprobadas</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">
                  {conteoAprobadas}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <div className="text-xs text-neutral-500">Rechazadas</div>
                <div className="mt-1 text-2xl font-bold text-rose-700">
                  {conteoRechazadas}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            {opcionesRevision.length > 1 && (
              <label className="text-sm text-neutral-700">
                Area
                <select
                  value={filtroArea}
                  onChange={(event) => setFiltroArea(event.target.value)}
                  className="mt-2 block min-w-[220px] rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Todas las areas</option>
                  {opcionesRevision.map((opcion) => (
                    <option key={opcion.clave} value={opcion.clave}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => void cargarTickets()}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:border-orange-200 hover:bg-orange-50"
            >
              Recargar
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white/90 p-1 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
          <button
            type="button"
            onClick={() => setVista("pendientes")}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
              vista === "pendientes"
                ? "bg-orange-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Pendientes
          </button>
          <button
            type="button"
            onClick={() => setVista("gestionadas")}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
              vista === "gestionadas"
                ? "bg-orange-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Gestionadas
          </button>
        </div>

        {loading && (
          <div className="rounded-xl border border-neutral-200 bg-white/90 p-6 text-neutral-600 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            Cargando solicitudes...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && ticketsPagina.length === 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white/90 p-6 text-neutral-600 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            No hay solicitudes para la vista seleccionada.
          </div>
        )}

        {!loading && ticketsPagina.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {ticketsPagina.map((ticket) => {
                const comentarioActual = comentarios[ticket.ticketId] || "";
                const estaGuardando = Boolean(guardando[ticket.ticketId]);
                const estadoLabel = obtenerEtiquetaEstadoAprobacion(
                  ticket.estadoAprobacion
                );
                const estadoClases = obtenerClasesEstadoAprobacion(
                  ticket.estadoAprobacion
                );

                return (
                  <article
                    key={ticket.ticketId}
                    className="rounded-2xl border border-neutral-200 bg-white/95 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.10)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-neutral-500">Ticket</div>
                        <div className="text-xl font-semibold text-neutral-900">
                          {ticket.ticketId}
                        </div>
                      </div>
                      {estadoLabel && (
                        <span
                          className={`rounded-lg border px-2 py-1 text-xs ${estadoClases}`}
                        >
                          {estadoLabel}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg border border-orange-200 bg-orange-100 px-2 py-1 text-xs text-orange-700">
                        {ticket.title}
                      </span>
                      {ticket.areaAprobacion && (
                        <span className="rounded-lg border border-fuchsia-200 bg-fuchsia-100 px-2 py-1 text-xs text-fuchsia-700">
                          {ticket.areaAprobacion}
                        </span>
                      )}
                      <span className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                        Riesgo {ticket.risk}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">
                          Solicitante
                        </div>
                        <p className="mt-2 text-sm text-neutral-900">
                          {nombreVisibleUsuario(ticket)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Usuario: {ticket.userId}
                        </p>
                        <p className="mt-3 text-xs text-neutral-500">
                          Creado: {formatearFecha(ticket.ticketTime || ticket.createdAt)}
                        </p>
                        {ticket.fechaSolicitudAprobacion && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Solicitado a jefatura:{" "}
                            {formatearFecha(ticket.fechaSolicitudAprobacion)}
                          </p>
                        )}
                        {ticket.fechaResolucionAprobacion && (
                          <p className="mt-1 text-xs text-neutral-500">
                            Resuelto por jefatura:{" "}
                            {formatearFecha(ticket.fechaResolucionAprobacion)}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">
                          Requerimiento
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm text-neutral-900">
                          {ticket.description}
                        </p>
                      </div>
                    </div>

                    {Array.isArray(ticket.images) && ticket.images.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">
                          Adjuntos
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {ticket.images.map((src, index) => (
                            <a
                              key={`${ticket.ticketId}-img-${index}`}
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative block h-28 overflow-hidden rounded-xl border border-neutral-200"
                            >
                              <img
                                src={src}
                                alt={`ticket-${index}`}
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {ticket.estadoAprobacion === "rechazado" &&
                      ticket.comentarioAprobacion && (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          <p className="font-semibold">Motivo del rechazo</p>
                          <p className="mt-1 whitespace-pre-line">
                            {ticket.comentarioAprobacion}
                          </p>
                        </div>
                      )}

                    {vista === "pendientes" && (
                      <div className="mt-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4">
                        <label className="block text-sm text-neutral-700">
                          Comentario de jefatura
                          <textarea
                            rows={3}
                            value={comentarioActual}
                            disabled={estaGuardando}
                            onChange={(event) =>
                              setComentarios((actual) => ({
                                ...actual,
                                [ticket.ticketId]: event.target.value,
                              }))
                            }
                            placeholder="Opcional si apruebas. Obligatorio si rechazas."
                            className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-fuchsia-500"
                          />
                        </label>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={estaGuardando || centroUsuariosLoading}
                            onClick={() => {
                              void resolverTicket(ticket, "approve").catch((err) => {
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "No se pudo aprobar la solicitud."
                                );
                              });
                            }}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                          >
                            {estaGuardando
                              ? "Guardando..."
                              : centroUsuariosLoading
                                ? "Cargando destinatarios..."
                                : "Aprobar solicitud"}
                          </button>
                          <button
                            type="button"
                            disabled={estaGuardando || centroUsuariosLoading}
                            onClick={() => {
                              void resolverTicket(ticket, "reject").catch((err) => {
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "No se pudo rechazar la solicitud."
                                );
                              });
                            }}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            Rechazar solicitud
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="mt-6">
              <Pagination
                currentPage={paginaActual}
                totalPages={totalPaginas}
                onPageChange={setPaginaActual}
                hasNextPage={paginaActual < totalPaginas}
                hasPrevPage={paginaActual > 1}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
