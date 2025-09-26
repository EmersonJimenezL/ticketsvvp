import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchTicketsMetrics,
  listTickets,
  patchTicket,
  type Ticket,
  type TicketsMetrics,
} from "../services/tickets";
import { useAuth } from "../auth/AuthContext";
import { getTicketsSocket } from "../lib/socket";

const RISK_ORDER: Record<Ticket["risk"], number> = {
  alto: 3,
  medio: 2,
  bajo: 1,
};
const RISK_BADGE: Record<Ticket["risk"], string> = {
  alto: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  medio: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  bajo: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
};
const RISK_RING: Record<Ticket["risk"], string> = {
  alto: "ring-red-500/20",
  medio: "ring-amber-500/20",
  bajo: "ring-emerald-500/20",
};
const riskOpts: Ticket["risk"][] = ["alto", "medio", "bajo"];
const stateOpts: Ticket["state"][] = [
  "recibido",
  "enProceso",
  "conDificultades",
  "resuelto",
];
const RISK_FILTER_OPTIONS = ["todos", ...riskOpts] as const;
type RiskFilter = (typeof RISK_FILTER_OPTIONS)[number];

type SortOption = "risk" | "createdAsc" | "createdDesc";
const SORT_LABEL: Record<SortOption, string> = {
  risk: "Riesgo (alto -> bajo)",
  createdAsc: "Creacion (antiguo -> reciente)",
  createdDesc: "Creacion (reciente -> antiguo)",
};

function getTicketDateValue(ticket: Ticket) {
  return new Date(ticket.ticketTime || ticket.createdAt || 0).getTime();
}

function getResolvedDateValue(ticket: Ticket) {
  return new Date(
    ticket.resolucionTime ||
      ticket.updatedAt ||
      ticket.ticketTime ||
      ticket.createdAt ||
      0
  ).getTime();
}

function formatResolutionTime(hours: number | null) {
  if (hours == null) return "Sin datos";
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remaining = Math.round(hours % 24);
    if (remaining === 0) return `${days} d`;
    return `${days} d ${remaining} h`;
  }
  if (hours >= 10) {
    return `${Math.round(hours)} h`;
  }
  return `${hours.toFixed(1)} h`;
}

function formatDateLabel(dateString: string) {
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}`;
}

type TrendChartProps = {
  data: TicketsMetrics["trend"];
};

function TrendChart({ data }: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-neutral-400">
        Sin datos suficientes
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map((item) => Math.max(item.created, item.resolved)),
    1
  );
  const width = Math.max((data.length - 1) * 32, 240);
  const height = 160;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const buildPoints = (key: "created" | "resolved") =>
    data
      .map((point, index) => {
        const x = index * step;
        const value = point[key];
        const y = height - (value / maxValue) * height;
        const safeY = Number.isFinite(y) ? y : height;
        return `${x.toFixed(2)},${safeY.toFixed(2)}`;
      })
      .join(" ");

  const createdPoints = buildPoints("created");
  const resolvedPoints = buildPoints("resolved");

  const lines = [0.25, 0.5, 0.75].map((ratio) => (
    <line
      key={ratio}
      x1={0}
      y1={height * ratio}
      x2={width}
      y2={height * ratio}
      stroke="rgba(255,255,255,0.08)"
      strokeDasharray="4 6"
    />
  ));

  const firstLabel = formatDateLabel(data[0].date);
  const midLabel = formatDateLabel(data[Math.floor(data.length / 2)].date);
  const lastLabel = formatDateLabel(data[data.length - 1].date);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
      >
        {lines}
        <polyline
          points={createdPoints}
          fill="none"
          stroke="#f97316"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <polyline
          points={resolvedPoints}
          fill="none"
          stroke="#34d399"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-neutral-500">
        <span>{firstLabel}</span>
        <span>{midLabel}</span>
        <span>{lastLabel}</span>
      </div>
    </div>
  );
}

type MetricsPanelProps = {
  metrics: TicketsMetrics | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

function MetricsPanel({
  metrics,
  loading,
  error,
  onRefresh,
}: MetricsPanelProps) {
  const showSkeleton = loading && !metrics;

  if (showSkeleton) {
    return (
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Resumen de tickets</h3>
            <p className="text-sm text-neutral-400">Calculando metricas...</p>
          </div>
          <div className="h-10 w-32 rounded-xl border border-white/10 bg-white/10 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
            />
          ))}
        </div>
        <div className="h-48 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Resumen de tickets</h3>
          <p className="text-sm text-neutral-400">
            Datos consolidados de los ultimos 30 dias
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition disabled:opacity-60"
        >
          {loading ? "Actualizando..." : "Actualizar metricas"}
        </button>
      </div>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <h4 className="text-sm text-neutral-400">Promedio de resolucion</h4>
          <p className="mt-2 text-3xl font-bold text-neutral-100">
            {formatResolutionTime(metrics?.avgResolutionTimeHours ?? null)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Desde apertura hasta cierre de ticket
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <h4 className="text-sm text-neutral-400">Riesgo alto abierto</h4>
          <p className="mt-2 text-3xl font-bold text-red-300">
            {metrics?.highRiskOpen ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Tickets por atender cuanto antes
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <h4 className="text-sm text-neutral-400">Tickets por categoria</h4>
          <ul className="mt-2 space-y-1 text-sm text-neutral-200">
            {(metrics?.ticketsByCategory ?? []).slice(0, 4).map((item) => (
              <li
                key={item.category}
                className="flex justify-between text-neutral-300"
              >
                <span className="truncate pr-2">{item.category}</span>
                <span className="font-semibold text-neutral-100">
                  {item.total}
                </span>
              </li>
            ))}
            {metrics && metrics.ticketsByCategory.length === 0 && (
              <li className="text-neutral-500">Sin informacion disponible</li>
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <h4 className="text-sm text-neutral-400">Tickets por usuario</h4>
          <ul className="mt-2 space-y-1 text-sm text-neutral-200">
            {(metrics?.ticketsByUser ?? []).slice(0, 5).map((item) => (
              <li
                key={`${item.userId || item.userName || "desconocido"}-user`}
                className="flex justify-between text-neutral-300"
              >
                <span className="truncate pr-2">
                  {item.userName || item.userId || "Sin usuario"}
                </span>
                <span className="font-semibold text-neutral-100">
                  {item.total}
                </span>
              </li>
            ))}
            {metrics && metrics.ticketsByUser.length === 0 && (
              <li className="text-neutral-500">Sin informacion disponible</li>
            )}
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-neutral-300">
            Evolucion diaria (ultimos 30 dias)
          </span>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />{" "}
              Creacion
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />{" "}
              Resolucion
            </span>
          </div>
        </div>
        <TrendChart data={metrics?.trend ?? []} />
      </div>
    </div>
  );
}

export default function Admin() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("todos");
  const [sortBy, setSortBy] = useState<SortOption>("risk");
  const [metrics, setMetrics] = useState<TicketsMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const refreshTickets = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await listTickets({ limit: 500 });
      if (!response.ok) {
        throw new Error(response.error || "No se pudieron cargar los tickets");
      }
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.message || "Error al obtener tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      setMetricsError(null);
      setMetricsLoading(true);
      const response = await fetchTicketsMetrics();
      if (!response.ok) {
        throw new Error(response.error || "No se pudieron obtener metricas");
      }
      setMetrics(response.data);
    } catch (err: any) {
      setMetricsError(err?.message || "Error al cargar metricas.");
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTickets();
    void refreshMetrics();
  }, [refreshTickets, refreshMetrics]);

  const handleIncomingTicket = useCallback(
    (incoming: Ticket) => {
      setItems((list) => {
        const without = list.filter(
          (item) => item.ticketId !== incoming.ticketId
        );
        return [...without, incoming];
      });
      if (incoming.state === "resuelto") {
        setCommentDraft((draft) => {
          if (!(incoming.ticketId in draft)) return draft;
          const { [incoming.ticketId]: _omit, ...rest } = draft;
          return rest;
        });
      }
      void refreshMetrics();
    },
    [refreshMetrics]
  );

  useEffect(() => {
    const socket = getTicketsSocket();
    if (!socket) return;

    const listener = (ticket: Ticket) => {
      handleIncomingTicket(ticket);
    };

    socket.on("ticket:created", listener);
    socket.on("ticket:updated", listener);

    return () => {
      socket.off("ticket:created", listener);
      socket.off("ticket:updated", listener);
    };
  }, [handleIncomingTicket]);

  const pendingTickets = useMemo(() => {
    const pending = items.filter((ticket) => ticket.state !== "resuelto");
    const filtered =
      riskFilter === "todos"
        ? pending
        : pending.filter((ticket) => ticket.risk === riskFilter);

    const sorted = [...filtered];
    switch (sortBy) {
      case "createdAsc":
        sorted.sort((a, b) => getTicketDateValue(a) - getTicketDateValue(b));
        break;
      case "createdDesc":
        sorted.sort((a, b) => getTicketDateValue(b) - getTicketDateValue(a));
        break;
      default:
        sorted.sort(
          (a, b) =>
            RISK_ORDER[b.risk] - RISK_ORDER[a.risk] ||
            getTicketDateValue(a) - getTicketDateValue(b)
        );
        break;
    }
    return sorted;
  }, [items, riskFilter, sortBy]);
  const resolvedTickets = useMemo(() => {
    const resolved = items.filter((ticket) => ticket.state === "resuelto");
    const filtered =
      riskFilter === "todos"
        ? resolved
        : resolved.filter((ticket) => ticket.risk === riskFilter);

    const sorted = [...filtered];
    switch (sortBy) {
      case "createdAsc":
        sorted.sort(
          (a, b) => getResolvedDateValue(a) - getResolvedDateValue(b)
        );
        break;
      case "createdDesc":
        sorted.sort(
          (a, b) => getResolvedDateValue(b) - getResolvedDateValue(a)
        );
        break;
      default:
        sorted.sort(
          (a, b) =>
            RISK_ORDER[b.risk] - RISK_ORDER[a.risk] ||
            getResolvedDateValue(b) - getResolvedDateValue(a)
        );
        break;
    }
    return sorted;
  }, [items, riskFilter, sortBy]);

  async function onPatch(
    ticket: Ticket,
    patch: Partial<Pick<Ticket, "risk" | "state">>
  ) {
    setSaving((state) => ({ ...state, [ticket.ticketId]: true }));
    setError(null);
    const previous = { ...ticket };

    try {
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId ? { ...item, ...patch } : item
        )
      );
      const response = await patchTicket(ticket.ticketId, patch);
      if (!response.ok) {
        throw new Error(response.error || "No se pudo actualizar el ticket.");
      }
      if (patch.state === "resuelto") {
        setCommentDraft((draft) => {
          if (!(ticket.ticketId in draft)) return draft;
          const { [ticket.ticketId]: _omit, ...rest } = draft;
          return rest;
        });
      }
      void refreshMetrics();
    } catch (err: any) {
      setItems((list) =>
        list.map((item) =>
          item.ticketId === previous.ticketId ? previous : item
        )
      );
      setError(err?.message || "Error actualizando el ticket.");
    } finally {
      setSaving((state) => ({ ...state, [ticket.ticketId]: false }));
    }
  }

  async function onSaveComment(ticket: Ticket) {
    const draft = commentDraft[ticket.ticketId] ?? ticket.comment ?? "";
    setSaving((state) => ({ ...state, [ticket.ticketId]: true }));
    setError(null);
    const previousComment = ticket.comment ?? "";

    try {
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId ? { ...item, comment: draft } : item
        )
      );
      const response = await patchTicket(ticket.ticketId, { comment: draft });
      if (!response.ok) {
        throw new Error(response.error || "No se pudo guardar el comentario.");
      }
    } catch (err: any) {
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId
            ? { ...item, comment: previousComment }
            : item
        )
      );
      setError(err?.message || "Error guardando comentario.");
    } finally {
      setSaving((state) => ({ ...state, [ticket.ticketId]: false }));
    }
  }

  const renderTicketCard = (ticket: Ticket) => (
    <article
      key={ticket.ticketId}
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ${
        RISK_RING[ticket.risk]
      } transition hover:bg-white/10`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold truncate">{ticket.title}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                RISK_BADGE[ticket.risk]
              }`}
            >
              {ticket.risk}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-300">{ticket.description}</p>
          {Array.isArray(ticket.images) && ticket.images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ticket.images.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt={`img-${index}`}
                  className="h-24 w-full rounded-lg border border-white/10 object-cover"
                />
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-neutral-400">
            {ticket.userName} -{" "}
            {ticket.ticketTime
              ? new Date(ticket.ticketTime).toLocaleString()
              : "sin fecha"}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">Riesgo</span>
          <select
            aria-label="Cambiar riesgo"
            disabled={saving[ticket.ticketId]}
            value={ticket.risk}
            onChange={(event) =>
              onPatch(ticket, { risk: event.target.value as Ticket["risk"] })
            }
            className="block w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
          >
            {riskOpts.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">Estado</span>
          <select
            aria-label="Cambiar estado"
            disabled={saving[ticket.ticketId]}
            value={ticket.state}
            onChange={(event) =>
              onPatch(ticket, { state: event.target.value as Ticket["state"] })
            }
            className="block w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
          >
            {stateOpts.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">Comentario</span>
          <textarea
            rows={3}
            value={commentDraft[ticket.ticketId] ?? ticket.comment ?? ""}
            onChange={(event) =>
              setCommentDraft((draft) => ({
                ...draft,
                [ticket.ticketId]: event.target.value,
              }))
            }
            placeholder="Describe acciones realizadas, hallazgos o notas."
            className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500"
          />
        </label>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSaveComment(ticket)}
            disabled={saving[ticket.ticketId]}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold transition hover:bg-orange-500 disabled:opacity-60"
          >
            {saving[ticket.ticketId] ? "Guardando..." : "Guardar comentario"}
          </button>
          {ticket.resolucionTime && (
            <span className="text-xs text-neutral-400">
              Resuelto: {new Date(ticket.resolucionTime).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  if (loading && !items.length) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div
            className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #f97316 0%, transparent 60%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #ea580c 0%, transparent 65%)",
            }}
          />
        </div>
        <div className="relative mx-auto w-full max-w-6xl space-y-6">
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Panel de administracion
              </h2>
              <p className="text-sm text-neutral-400">
                Cargando tickets y metricas...
              </p>
            </div>
            <div className="h-10 w-24 rounded-xl border border-white/10 bg-white/10 animate-pulse" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`metric-skel-${index}`}
                className="h-28 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
              />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`card-skel-${index}`}
                className="h-48 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 py-10">
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
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Gestion de tickets
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Cerrar sesion
            </button>
          </div>
        </div>

        <MetricsPanel
          metrics={metrics}
          loading={metricsLoading}
          error={metricsError}
          onRefresh={() => {
            void refreshMetrics();
          }}
        />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-neutral-300">
              Riesgo
              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(event.target.value as RiskFilter)
                }
                className="ml-2 rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500"
              >
                {RISK_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-neutral-300">
              Ordenar
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as SortOption)
                }
                className="ml-2 rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500"
              >
                {(Object.keys(SORT_LABEL) as SortOption[]).map((option) => (
                  <option key={option} value={option}>
                    {SORT_LABEL[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="text-sm text-neutral-400">
            Pendientes:{" "}
            <span className="font-semibold text-neutral-100">
              {pendingTickets.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pendingTickets.map(renderTicketCard)}
        </div>

        {pendingTickets.length === 0 && !loading && (
          <div className="mt-10 text-center text-neutral-400">
            No hay tickets pendientes.
          </div>
        )}

        <div className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-neutral-100">
              Tickets resueltos ({resolvedTickets.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowResolved((open) => !open)}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-neutral-200 hover:bg-white/10 transition"
            >
              {showResolved ? "Ocultar" : "Ver resueltos"}
            </button>
          </div>

          {showResolved &&
            (resolvedTickets.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                No hay tickets resueltos con los filtros seleccionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {resolvedTickets.map(renderTicketCard)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
