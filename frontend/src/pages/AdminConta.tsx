import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";
import { useCentroUsuarios } from "../features/gestion-activos/hooks/useCentroUsuarios";
import { Pagination } from "../features/gestion-activos/components/Pagination";
import { listTicketsPaginated, type Ticket } from "../services/tickets";
import {
  obtenerAreasEquipoCentroUsuario,
  obtenerClasesEstadoAprobacion,
  obtenerEtiquetaEstadoAprobacion,
  obtenerOpcionesRevisionUsuario,
  normalizarRol,
} from "../utils/ticketApproval";

const PAGE_SIZE = 12;

type TrabajadorEquipo = {
  userId: string;
  displayName: string;
  areas: string[];
  areaLabels: string[];
};

function nombreCentroUsuario(usuario: {
  pnombre?: string;
  snombre?: string;
  papellido?: string;
  sapellido?: string;
  usuario?: string;
}) {
  return [
    usuario.pnombre || "",
    usuario.snombre || "",
    usuario.papellido || "",
    usuario.sapellido || "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || usuario.usuario || "Sin usuario";
}

function formatearFecha(valor?: string) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleString("es-CL");
}

function colorEstado(state?: Ticket["state"]) {
  switch (state) {
    case "recibido":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "enProceso":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "conDificultades":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "resuelto":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
  }
}

function colorRiesgo(risk?: Ticket["risk"]) {
  switch (risk) {
    case "alto":
      return "border-red-200 bg-red-50 text-red-700";
    case "medio":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "bajo":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
  }
}

export default function AdminConta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    usuarios,
    loading: usersLoading,
    error: usersError,
  } = useCentroUsuarios();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [conteoPendientes, setConteoPendientes] = useState(0);
  const [conteoResueltos, setConteoResueltos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const opcionesRevision = useMemo(
    () => obtenerOpcionesRevisionUsuario(user || undefined),
    [user]
  );

  const isAuthorized = opcionesRevision.length > 0;
  const destinoVolver = isTicketAdmin(user || undefined) ? "/admin" : "/menu";

  const trabajadoresEquipo = useMemo<TrabajadorEquipo[]>(() => {
    if (!opcionesRevision.length) return [];

    const mapa = new Map<string, TrabajadorEquipo>();

    for (const usuarioCentro of usuarios || []) {
      const userId = (usuarioCentro.usuario || "").trim().toLowerCase();
      if (!userId) continue;

      const areas = obtenerAreasEquipoCentroUsuario(
        usuarioCentro,
        opcionesRevision
      );
      if (!areas.length) continue;

      const areaLabels = opcionesRevision
        .filter((item) => areas.includes(item.clave))
        .map((item) => item.etiqueta);

      mapa.set(userId, {
        userId,
        displayName: nombreCentroUsuario(usuarioCentro),
        areas,
        areaLabels,
      });
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "es", {
        sensitivity: "base",
      })
    );
  }, [opcionesRevision, usuarios]);

  const trabajadoresMap = useMemo(
    () => new Map(trabajadoresEquipo.map((item) => [item.userId, item])),
    [trabajadoresEquipo]
  );

  const trabajadoresFiltradosPorArea = useMemo(() => {
    if (!filtroArea) return trabajadoresEquipo;
    return trabajadoresEquipo.filter((item) => item.areas.includes(filtroArea));
  }, [filtroArea, trabajadoresEquipo]);

  const workerSet = useMemo(
    () => new Set(trabajadoresFiltradosPorArea.map((item) => item.userId)),
    [trabajadoresFiltradosPorArea]
  );

  const workerIds = useMemo(
    () => Array.from(workerSet),
    [workerSet]
  );

  const areasDisponibles = useMemo(
    () =>
      opcionesRevision.map((item) => ({
        clave: item.clave,
        etiqueta: item.etiqueta,
      })),
    [opcionesRevision]
  );

  useEffect(() => {
    if (opcionesRevision.length === 1) {
      setFiltroArea(opcionesRevision[0].clave);
      return;
    }

    setFiltroArea((actual) => {
      if (!actual) return "";
      return opcionesRevision.some((item) => item.clave === actual) ? actual : "";
    });
  }, [opcionesRevision]);

  useEffect(() => {
    setPaginaActual(1);
  }, [search, fromDate, toDate, filtroArea]);

  useEffect(() => {
    if (!isAuthorized) {
      navigate(destinoVolver, { replace: true });
    }
  }, [destinoVolver, isAuthorized, navigate]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (usersLoading) return;
    if (workerIds.length === 0) {
      setTickets([]);
      setTotalTickets(0);
      setConteoPendientes(0);
      setConteoResueltos(0);
      return;
    }

    let cancelled = false;

    async function fetchTicketsPage() {
      try {
        setLoading(true);
        setError(null);
        const skip = (paginaActual - 1) * PAGE_SIZE;
        const paramsBase = {
          userIds: workerIds,
          search: search.trim() || undefined,
          dateFrom: fromDate || undefined,
          dateTo: toDate || undefined,
          sortBy: "createdDesc",
        } as const;

        const [paginaResponse, pendientesResponse, resueltosResponse] =
          await Promise.all([
            listTicketsPaginated({
              ...paramsBase,
              limit: PAGE_SIZE,
              skip,
            }),
            listTicketsPaginated({
              ...paramsBase,
              limit: 1,
              skip: 0,
              excludeState: "resuelto",
            }),
            listTicketsPaginated({
              ...paramsBase,
              limit: 1,
              skip: 0,
              state: "resuelto",
            }),
          ]);

        if (!paginaResponse.ok) {
          throw new Error(paginaResponse.error || "Error al cargar tickets");
        }

        const respuestaConteoConError = [pendientesResponse, resueltosResponse].find(
          (respuesta) => !respuesta.ok
        );
        if (respuestaConteoConError) {
          throw new Error(
            respuestaConteoConError.error ||
              "No se pudieron cargar los conteos del equipo"
          );
        }

        const paginaFiltrada = (paginaResponse.data || []).filter((ticket) => {
          const userId = normalizarRol(ticket.userId || "");
          return trabajadoresMap.has(userId);
        });

        if (!cancelled) {
          setTickets(paginaFiltrada);
          setTotalTickets(paginaResponse.count || 0);
          setConteoPendientes(pendientesResponse.count || 0);
          setConteoResueltos(resueltosResponse.count || 0);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "No se pudieron cargar los tickets");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchTicketsPage();

    return () => {
      cancelled = true;
    };
  }, [
    filtroArea,
    isAuthorized,
    fromDate,
    paginaActual,
    search,
    toDate,
    trabajadoresMap,
    usersLoading,
    workerIds,
  ]);

  const resumen = useMemo(() => {
    return {
      total: totalTickets,
      pendientes: conteoPendientes,
      resueltos: conteoResueltos,
    };
  }, [conteoPendientes, conteoResueltos, totalTickets]);

  const totalPaginas = Math.max(1, Math.ceil(totalTickets / PAGE_SIZE));
  const filtrosGridClassName =
    areasDisponibles.length > 1
      ? "md:grid-cols-2 2xl:grid-cols-4"
      : "md:grid-cols-3";

  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white px-4 py-8 text-neutral-900 lg:px-6">
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

      <div className="relative mx-auto w-full max-w-[1680px]">
        <AppHeader
          title="Tickets de mi equipo"
          subtitle="Seguimiento de tickets creados por trabajadores de tus áreas"
          backTo={destinoVolver}
        />

        {usersError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {usersError}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            <div className="grid grid-cols-3 divide-x divide-neutral-200">
              <div className="px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Total
                </div>
                <div className="mt-2 text-3xl font-black text-neutral-900">
                  {resumen.total}
                </div>
              </div>
              <div className="bg-amber-50/80 px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Pendientes
                </div>
                <div className="mt-2 text-3xl font-black text-amber-700">
                  {resumen.pendientes}
                </div>
              </div>
              <div className="bg-emerald-50/80 px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Resueltos
                </div>
                <div className="mt-2 text-3xl font-black text-emerald-700">
                  {resumen.resueltos}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            <div className={`grid gap-3 ${filtrosGridClassName}`}>
              {areasDisponibles.length > 1 && (
                <label className="text-sm text-neutral-700">
                  Área
                  <select
                    value={filtroArea}
                    onChange={(event) => setFiltroArea(event.target.value)}
                    className="mt-2 block h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Todas las áreas</option>
                    {areasDisponibles.map((area) => (
                      <option key={area.clave} value={area.clave}>
                        {area.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="text-sm text-neutral-700">
                Buscar
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Usuario, ticket o categoria"
                  className="mt-2 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>

              <label className="text-sm text-neutral-700">
                Desde
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>

              <label className="text-sm text-neutral-700">
                Hasta
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-sm font-semibold text-neutral-700">
              Tickets del equipo ({totalTickets})
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              Cargando tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              No hay tickets para mostrar.
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-200 md:hidden">
                {tickets.map((ticket) => {
                  const trabajador = trabajadoresMap.get(
                    normalizarRol(ticket.userId || "")
                  );
                  const approvalLabel = obtenerEtiquetaEstadoAprobacion(
                    ticket.estadoAprobacion
                  );
                  const approvalClasses = obtenerClasesEstadoAprobacion(
                    ticket.estadoAprobacion
                  );

                  return (
                    <article
                      key={ticket.ticketId}
                      className="space-y-3 px-4 py-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-neutral-900">
                          {ticket.ticketId}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${colorEstado(
                            ticket.state
                          )}`}
                        >
                          {ticket.state}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${colorRiesgo(
                            ticket.risk
                          )}`}
                        >
                          {ticket.risk}
                        </span>
                        {approvalLabel && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${approvalClasses}`}
                          >
                            {approvalLabel}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          Trabajador
                        </p>
                        <p className="text-neutral-800">
                          {trabajador?.displayName ||
                            ticket.userFullName ||
                            ticket.userName ||
                            ticket.userId ||
                            "-"}
                        </p>
                        {trabajador?.areaLabels?.length ? (
                          <p className="mt-1 text-xs text-neutral-500">
                            {trabajador.areaLabels.join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          Categoría
                        </p>
                        <p className="text-neutral-800">{ticket.title}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          Fecha
                        </p>
                        <p className="text-neutral-800">
                          {formatearFecha(ticket.ticketTime || ticket.createdAt)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm text-neutral-900">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Ticket
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Trabajador
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Área
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Categoría
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Riesgo
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Aprobación
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => {
                      const trabajador = trabajadoresMap.get(
                        normalizarRol(ticket.userId || "")
                      );
                      const approvalLabel = obtenerEtiquetaEstadoAprobacion(
                        ticket.estadoAprobacion
                      );
                      const approvalClasses = obtenerClasesEstadoAprobacion(
                        ticket.estadoAprobacion
                      );

                      return (
                        <tr
                          key={ticket.ticketId}
                          className="border-t border-neutral-200 odd:bg-neutral-50/60"
                        >
                          <td className="px-4 py-3 font-medium text-neutral-800">
                            {ticket.ticketId}
                          </td>
                          <td className="px-4 py-3 text-neutral-800">
                            {trabajador?.displayName ||
                              ticket.userFullName ||
                              ticket.userName ||
                              ticket.userId ||
                              "-"}
                          </td>
                          <td className="px-4 py-3 text-neutral-800">
                            {trabajador?.areaLabels?.join(", ") || "-"}
                          </td>
                          <td className="px-4 py-3 text-neutral-800">
                            {ticket.title}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${colorEstado(
                                ticket.state
                              )}`}
                            >
                              {ticket.state}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${colorRiesgo(
                                ticket.risk
                              )}`}
                            >
                              {ticket.risk}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {approvalLabel ? (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs ${approvalClasses}`}
                              >
                                {approvalLabel}
                              </span>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-800">
                            {formatearFecha(ticket.ticketTime || ticket.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-neutral-200 px-4 py-4">
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
    </div>
  );
}
