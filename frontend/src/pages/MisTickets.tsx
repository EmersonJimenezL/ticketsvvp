// src/pages/MisTickets.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listTickets, rateTicket, type Ticket } from "../services/tickets";
import AppHeader from "../components/AppHeader";
import TicketRatingCard from "../components/TicketRatingCard";

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
const RISK_ORDER: Record<Ticket["risk"], number> = {
  alto: 3,
  medio: 2,
  bajo: 1,
};
const STATE_ORDER: Record<Ticket["state"], number> = {
  recibido: 1,
  enProceso: 2,
  conDificultades: 3,
  resuelto: 4,
};
const SORT_OPTIONS = [
  { value: "dateAsc", label: "Fecha (antiguo -> reciente)" },
  { value: "dateDesc", label: "Fecha (reciente -> antiguo)" },
  { value: "riskDesc", label: "Riesgo (alto -> bajo)" },
  { value: "stateAsc", label: "Estado (recibido -> resuelto)" },
  { value: "titleAsc", label: "Categoria (A -> Z)" },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export default function MisTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState<"" | Ticket["state"]>("");
  const [titulo, setTitulo] = useState<"" | Ticket["title"]>("");
  const [sortBy, setSortBy] = useState<SortOption>("dateAsc");
  const [statusTab, setStatusTab] = useState<"pendientes" | "resueltos">(
    "pendientes"
  );
  const [imageModal, setImageModal] = useState<{ src: string; index: number; total: number } | null>(null);

  const handleRateTicket = useCallback(
    async (ticketId: string, score: number, comment: string) => {
      if (!user?.nombreUsuario) {
        throw new Error("Sesion no valida.");
      }

      const normalizedComment = comment.trim();
      const payload = {
        ratingScore: score,
        ratingComment: normalizedComment || undefined,
        userId: user.nombreUsuario,
      };

      const resp = await rateTicket(ticketId, payload);
      if (!resp.ok) {
        throw new Error(resp.error || "No se pudo guardar la calificacion.");
      }

      setItems((current) =>
        current.map((ticket) =>
          ticket.ticketId === ticketId
            ? {
                ...ticket,
                ratingScore: score,
                ratingComment: normalizedComment || undefined,
              }
            : ticket
        )
      );
    },
    [user?.nombreUsuario]
  );

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
        const next = Array.isArray(resp.data) ? resp.data : [];
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

  // Auto-refresh cada 30 segundos para mantener datos actualizados
  useEffect(() => {
    const interval = setInterval(() => {
      cargar({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, [cargar]);

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

  const sortedTickets = useMemo(() => {
    const list = [...filteredTickets];
    switch (sortBy) {
      case "dateDesc":
        list.sort((a, b) => getTicketDateValue(b) - getTicketDateValue(a));
        break;
      case "riskDesc":
        list.sort(
          (a, b) =>
            RISK_ORDER[b.risk] - RISK_ORDER[a.risk] ||
            getTicketDateValue(a) - getTicketDateValue(b)
        );
        break;
      case "stateAsc":
        list.sort(
          (a, b) =>
            STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
            getTicketDateValue(a) - getTicketDateValue(b)
        );
        break;
      case "titleAsc":
        list.sort(
          (a, b) =>
            a.title.localeCompare(b.title) ||
            getTicketDateValue(a) - getTicketDateValue(b)
        );
        break;
      case "dateAsc":
      default:
        list.sort((a, b) => getTicketDateValue(a) - getTicketDateValue(b));
        break;
    }
    return list;
  }, [filteredTickets, sortBy]);

  const pendingTickets = useMemo(
    () => sortedTickets.filter((ticket) => ticket.state !== "resuelto"),
    [sortedTickets]
  );
  const resolvedTickets = useMemo(
    () => sortedTickets.filter((ticket) => ticket.state === "resuelto"),
    [sortedTickets]
  );

  function colorEstado(s: Ticket["state"]) {
    switch (s) {
      case "recibido":
        return "bg-neutral-200 text-neutral-800 border-neutral-300";
      case "enProceso":
        return "bg-blue-600/20 text-blue-300 border-blue-600/40";
      case "resuelto":
        return "bg-emerald-600/20 text-emerald-300 border-emerald-600/40";
      case "conDificultades":
        return "bg-amber-600/20 text-amber-300 border-amber-600/40";
      default:
        return "bg-neutral-200 text-neutral-800 border-neutral-300";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-neutral-400">Ticket</div>
          <div className="text-lg font-semibold text-neutral-100">
            {ticket.ticketId}
          </div>
        </div>
        <div className="text-xs text-neutral-400">
          {ticket.ticketTime ? new Date(ticket.ticketTime).toLocaleString() : ""}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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

      <div className="mt-3 text-neutral-200">
        <p className="whitespace-pre-line text-sm text-neutral-300">
          {ticket.description}
        </p>

        {/* Mostrar quien est  atendiendo el ticket */}
        <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
          {ticket.asignadoA ? (
            <p className="text-sm text-blue-300">
              <span className="font-semibold">Atendido por:</span> {ticket.asignadoA}
            </p>
          ) : (
            <p className="text-sm text-neutral-400">
              Tu ticket esta pendiente de asignacion
            </p>
          )}
        </div>
        {Array.isArray(ticket.images) && ticket.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {ticket.images.map((src, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setImageModal({ src, index, total: ticket.images!.length })}
                className="group relative h-28 w-full overflow-hidden rounded-md border border-white/10 transition hover:border-orange-500/50"
              >
                <img
                  src={src}
                  alt={`img-${index}`}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                  <span className="text-xs font-semibold text-white">Ver imagen</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {ticket.comment && (
          <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
            <p className="text-sm text-neutral-900">
              <span className="font-semibold">Comentario:</span> {ticket.comment}
            </p>
          </div>
        )}
        {ticket.resolucionTime && (
          <p className="mt-1 text-xs text-neutral-400">
            Resuelto: {new Date(ticket.resolucionTime).toLocaleString()}
          </p>
        )}

        {ticket.state === "resuelto" && (
          <TicketRatingCard
            ticketId={ticket.ticketId}
            ratingScore={ticket.ratingScore}
            ratingComment={ticket.ratingComment}
            onSubmit={(score, comment) => handleRateTicket(ticket.ticketId, score, comment)}
          />
        )}
      </div>
    </div>
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
          title="Mis tickets"
          subtitle="Revisa tus solicitudes pendientes y resueltas"
          backTo="/menu"
        />

        <div className="mb-6 flex flex-wrap items-center gap-3">
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

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            className="min-w-[220px] rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
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
            className="min-w-[220px] rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
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

          <select
            className="min-w-[240px] rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
          <div className="space-y-6">
            <div className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setStatusTab("pendientes")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  statusTab === "pendientes"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Pendientes ({pendingTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("resueltos")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  statusTab === "resueltos"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Resueltos ({resolvedTickets.length})
              </button>
            </div>

            {statusTab === "pendientes" ? (
              pendingTickets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                  No tienes tickets pendientes para los filtros seleccionados.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pendingTickets.map(renderTicketCard)}
                </div>
              )
            ) : resolvedTickets.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                No se encontraron tickets resueltos con los filtros actuales.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {resolvedTickets.map(renderTicketCard)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de imagen ampliada */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImageModal(null)}
        >
          <button
            type="button"
            onClick={() => setImageModal(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
            title="Cerrar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageModal.src}
              alt="Imagen ampliada"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
            <div className="mt-3 text-center text-sm text-neutral-300">
              Imagen {imageModal.index + 1} de {imageModal.total}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

