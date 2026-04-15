import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";
import { useCentroUsuarios } from "../features/gestion-activos/hooks/useCentroUsuarios";
import { listTickets, type Ticket } from "../services/tickets";
import {
  obtenerAreasEquipoCentroUsuario,
  obtenerClasesEstadoAprobacion,
  obtenerEtiquetaEstadoAprobacion,
  obtenerOpcionesRevisionUsuario,
  normalizarRol,
} from "../utils/ticketApproval";

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
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtroArea, setFiltroArea] = useState("");

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

  const workerSet = useMemo(
    () => new Set(trabajadoresEquipo.map((item) => item.userId)),
    [trabajadoresEquipo]
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
    if (!isAuthorized) {
      navigate(destinoVolver, { replace: true });
    }
  }, [destinoVolver, isAuthorized, navigate]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (usersLoading) return;
    if (workerSet.size === 0) {
      setTickets([]);
      return;
    }

    let cancelled = false;

    async function fetchAllTickets() {
      try {
        setLoading(true);
        setError(null);

        const limit = 200;
        let skip = 0;
        let total = 0;
        let all: Ticket[] = [];

        while (true) {
          const resp = await listTickets({ limit, skip, sortBy: "createdDesc" });
          if (!resp.ok) {
            throw new Error(resp.error || "Error al cargar tickets");
          }

          total = resp.count ?? 0;
          all = all.concat(resp.data || []);

          if ((resp.data || []).length < limit || all.length >= total) {
            break;
          }

          skip += limit;
        }

        const filtered = all.filter((ticket) => {
          const userId = normalizarRol(ticket.userId || "");
          return workerSet.has(userId);
        });

        filtered.sort((a, b) => {
          const fechaA = new Date(a.ticketTime || a.createdAt || 0).getTime();
          const fechaB = new Date(b.ticketTime || b.createdAt || 0).getTime();
          return fechaB - fechaA;
        });

        if (!cancelled) {
          setTickets(filtered);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "No se pudieron cargar los tickets");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAllTickets();

    return () => {
      cancelled = true;
    };
  }, [isAuthorized, usersLoading, workerSet]);

  useEffect(() => {
    const normalizedSearch = normalizarRol(search);
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    const next = tickets.filter((ticket) => {
      const userId = normalizarRol(ticket.userId || "");
      const trabajador = trabajadoresMap.get(userId);
      if (!trabajador) return false;

      if (filtroArea && !trabajador.areas.includes(filtroArea)) {
        return false;
      }

      const searchable = [
        ticket.ticketId || "",
        ticket.title || "",
        ticket.userId || "",
        ticket.userName || "",
        ticket.userFullName || "",
        trabajador.displayName,
        trabajador.areaLabels.join(" "),
      ]
        .map((value) => normalizarRol(value))
        .join(" ");

      if (normalizedSearch && !searchable.includes(normalizedSearch)) {
        return false;
      }

      const dateRaw = ticket.ticketTime || ticket.createdAt;
      if (!dateRaw) return true;
      const date = new Date(dateRaw);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });

    setFilteredTickets(next);
  }, [tickets, search, fromDate, toDate, filtroArea, trabajadoresMap]);

  const resumen = useMemo(() => {
    const pendientes = filteredTickets.filter(
      (ticket) => ticket.state !== "resuelto"
    ).length;
    const resueltos = filteredTickets.filter(
      (ticket) => ticket.state === "resuelto"
    ).length;
    return {
      total: filteredTickets.length,
      pendientes,
      resueltos,
    };
  }, [filteredTickets]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white px-4 py-10 text-neutral-900">
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

      <div className="relative mx-auto w-full max-w-6xl">
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

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Total
              </div>
              <div className="mt-2 text-2xl font-bold text-neutral-900">
                {resumen.total}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Pendientes
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-700">
                {resumen.pendientes}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Resueltos
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                {resumen.resueltos}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
              Tickets del equipo ({filteredTickets.length})
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              Cargando tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              No hay tickets para mostrar.
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-200 md:hidden">
                {filteredTickets.map((ticket) => {
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
                    {filteredTickets.map((ticket) => {
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
