// src/pages/MisTickets.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listTickets, type Ticket } from "../services/tickets";
import { getTicketsSocket } from "../lib/socket";

const ESTADOS: Ticket["state"][] = [
  "recibido",
  "enProceso",
  "resuelto",
  "conDificultades",
];
const TITULOS: Ticket["title"][] = [
  "SAP",
  "Impresoras",
  "Cuentas",
  "Rinde Gastos",
  "Terreno",
  "Otros",
];

const FETCH_LIMIT = 200;

function getTicketDateValue(ticket: Ticket) {
  return new Date(ticket.ticketTime || ticket.createdAt || 0).getTime();
}

function sortTicketsByDate(list: Ticket[]) {
  return [...list].sort((a, b) => getTicketDateValue(b) - getTicketDateValue(a));
}

export default function MisTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState<"" | Ticket["state"]>("");
  const [titulo, setTitulo] = useState<"" | Ticket["title"]>("");

  const cargar = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;

      if (!user?.nombreUsuario) {
        setError("Sesion no valida.");
        setItems([]);
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }
        const resp = await listTickets({
          userId: user.nombreUsuario,
          limit: FETCH_LIMIT,
        });
        if (!resp.ok) throw new Error(resp.error || "Error listando tickets");
        const next = Array.isArray(resp.data) ? sortTicketsByDate(resp.data) : [];
        setItems(next);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "No se pudo obtener tus tickets");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [user?.nombreUsuario]
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const socket = getTicketsSocket();
    if (!socket || !user?.nombreUsuario) {
      return;
    }

    const handleTicket = (incoming: Ticket) => {
      if (incoming.userId !== user.nombreUsuario) return;

      setItems((current) => {
        const without = current.filter((item) => item.ticketId !== incoming.ticketId);
        const next = sortTicketsByDate([...without, incoming]);
        return next.slice(0, FETCH_LIMIT);
      });
    };

    socket.on("ticket:created", handleTicket);
    socket.on("ticket:updated", handleTicket);

    return () => {
      socket.off("ticket:created", handleTicket);
      socket.off("ticket:updated", handleTicket);
    };
  }, [user?.nombreUsuario]);
  useEffect(() => {
    const onFocus = () => {
      void cargar({ silent: true });
    };
    const onVisible = () => {
      if (!document.hidden) {
        void cargar({ silent: true });
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [cargar]);

  const filteredTickets = useMemo(() => {
    return items.filter((ticket) => {
      if (titulo && ticket.title !== titulo) return false;
      if (estado && ticket.state !== estado) return false;
      return true;
    });
  }, [items, titulo, estado]);

  const pendingTickets = useMemo(
    () => filteredTickets.filter((ticket) => ticket.state !== "resuelto"),
    [filteredTickets]
  );
  const resolvedTickets = useMemo(
    () => filteredTickets.filter((ticket) => ticket.state === "resuelto"),
    [filteredTickets]
  );

  function colorEstado(s: Ticket["state"]) {
    switch (s) {
      case "recibido":
        return "bg-neutral-700 text-neutral-200";
      case "enProceso":
        return "bg-blue-600/20 text-blue-300 border-blue-600/40";
      case "resuelto":
        return "bg-emerald-600/20 text-emerald-300 border-emerald-600/40";
      case "conDificultades":
        return "bg-amber-600/20 text-amber-300 border-amber-600/40";
      default:
        return "bg-neutral-700 text-neutral-200";
    }
  }
  function colorRiesgo(r: Ticket["risk"]) {
    switch (r) {
      case "alto":
        return "bg-red-600/20 text-red-300 border-red-600/40";
      case "medio":
        return "bg-amber-600/20 text-amber-300 border-amber-600/40";
      case "bajo":
        return "bg-emerald-600/20 text-emerald-300 border-emerald-600/40";
      default:
        return "bg-neutral-700 text-neutral-200";
    }
  }

  const renderTicketCard = (ticket: Ticket) => (
    <div
      key={ticket.ticketId}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg border border-orange-600/30 bg-orange-600/20 px-2 py-1 text-xs text-orange-300">
            {ticket.title}
          </span>
          <span
            className={`rounded-lg px-2 py-1 text-xs border ${colorEstado(ticket.state)}`}
          >
            {ticket.state}
          </span>
          <span
            className={`rounded-lg px-2 py-1 text-xs border ${colorRiesgo(ticket.risk)}`}
          >
            {ticket.risk}
          </span>
        </div>
        <div className="text-xs text-neutral-400">
          {ticket.ticketTime ? new Date(ticket.ticketTime).toLocaleString() : ""}
        </div>
      </div>

      <div className="mt-3 text-neutral-200">
        <div className="font-semibold">{ticket.ticketId}</div>
        <p className="mt-1 whitespace-pre-line text-sm text-neutral-300">
          {ticket.description}
        </p>

        {Array.isArray(ticket.images) && ticket.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {ticket.images.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`img-${index}`}
                className="h-28 w-full rounded-md border border-white/10 object-cover"
              />
            ))}
          </div>
        )}

        {ticket.comment && (
          <p className="mt-3 text-sm text-neutral-200">
            <span className="font-semibold">Comentario:</span> {ticket.comment}
          </p>
        )}
        {ticket.resolucionTime && (
          <p className="mt-1 text-xs text-neutral-400">
            Resuelto: {new Date(ticket.resolucionTime).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 py-10">
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

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Mis tickets</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Revisa tus solicitudes pendientes y resueltas de forma separada.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/tickets/nuevo")}
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold transition hover:bg-orange-500"
            >
              Crear ticket
            </button>
            <button
              type="button"
              onClick={() => cargar()}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Recargar
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            className="rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value as Ticket["title"] | "")}
          >
            <option value="">Todas las categorias</option>
            {TITULOS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            value={estado}
            onChange={(event) => setEstado(event.target.value as Ticket["state"] | "")}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">Cargando...</div>
        )}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-10">
            <section>
              <header className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-neutral-100">
                  Pendientes ({pendingTickets.length})
                </h2>
              </header>
              {pendingTickets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                  No tienes tickets pendientes para los filtros seleccionados.
                </div>
              ) : (
                <div className="space-y-3">{pendingTickets.map(renderTicketCard)}</div>
              )}
            </section>

            <section>
              <header className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-neutral-100">
                  Resueltos ({resolvedTickets.length})
                </h2>
              </header>
              {resolvedTickets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                  No se encontraron tickets resueltos con los filtros actuales.
                </div>
              ) : (
                <div className="space-y-3">{resolvedTickets.map(renderTicketCard)}</div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}








