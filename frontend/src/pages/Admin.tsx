import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchTicketsMetrics,
  listTickets,
  patchTicket,
  assignTicket,
  type Ticket,
  type TicketsMetrics,
} from "../services/tickets";
import { useAuth } from "../auth/AuthContext";
import AppHeader from "../components/AppHeader";

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

// Usuarios autorizados para gestionar tickets
const AUTHORIZED_USERS = ["mcontreras", "ejimenez", "igonzalez"] as const;
const ASSIGN_OPTIONS = [
  { value: "", label: "Sin asignar" },
  { value: "Mauricio Contreras", label: "Mauricio Contreras" },
  { value: "Emerson Jiménez", label: "Emerson Jiménez" },
  { value: "Ignacio González", label: "Ignacio González" },
] as const;

type SortOption = "risk" | "createdAsc" | "createdDesc" | "resolvedDesc";
const SORT_LABEL: Record<SortOption, string> = {
  risk: "Riesgo (alto -> bajo)",
  createdAsc: "Creacion (antiguo -> reciente)",
  createdDesc: "Creacion (reciente -> antiguo)",
  resolvedDesc: "Resuelto (reciente -> antiguo)",
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

function sortTicketsByOption(
  list: Ticket[],
  sortBy: SortOption,
  useResolvedDate: boolean
) {
  const sorted = [...list];
  const dateValue = (ticket: Ticket) =>
    useResolvedDate ? getResolvedDateValue(ticket) : getTicketDateValue(ticket);

  switch (sortBy) {
    case "createdAsc":
      sorted.sort((a, b) => getTicketDateValue(a) - getTicketDateValue(b));
      break;
    case "createdDesc":
      sorted.sort((a, b) => getTicketDateValue(b) - getTicketDateValue(a));
      break;
    case "resolvedDesc":
      sorted.sort((a, b) => dateValue(b) - dateValue(a));
      break;
    default:
      sorted.sort(
        (a, b) => RISK_ORDER[b.risk] - RISK_ORDER[a.risk] || dateValue(a) - dateValue(b)
      );
      break;
  }
  return sorted;
}

function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function formatRating(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "Sin datos";
  return value.toFixed(2);
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

  const monthNames = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];

  const formatMonthLabel = (key: string) => {
    const parts = key.split("-");
    if (parts.length !== 2) return key;
    const year = parts[0];
    const monthIndex = Number(parts[1]) - 1;
    const name = monthNames[monthIndex] || key;
    return `${name} ${year}`;
  };

  const monthMap = new Map<string, { month: string; created: number; resolved: number }>();

  for (const item of data) {
    if (typeof item.date !== "string") continue;
    const key = item.date.slice(0, 7);
    if (key.length !== 7) continue;
    const created = Number(item.created) || 0;
    const resolved = Number(item.resolved) || 0;
    const current = monthMap.get(key) ?? { month: key, created: 0, resolved: 0 };
    current.created += created;
    current.resolved += resolved;
    monthMap.set(key, current);
  }

  const months = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map((item) => ({
      ...item,
      label: formatMonthLabel(item.month),
    }));

  if (!months.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-neutral-400">
        Sin datos suficientes
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={months} margin={{ top: 10, right: 24, left: 24, bottom: 36 }}>
          <defs>
            <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="resolvedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickMargin={8}
            label={{
              value: "Mes",
              position: "insideBottom",
              offset: -6,
              fill: "#9ca3af",
              fontSize: 14,
            }}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            allowDecimals={false}
            tickMargin={8}
            label={{
              value: "Tickets",
              angle: -90,
              position: "insideLeft",
              offset: -6,
              fill: "#9ca3af",
              fontSize: 14,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 15, 15, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#f3f4f6",
            }}
          />
          <Area
            type="monotone"
            dataKey="created"
            name="Creacion"
            stroke="#f97316"
            fill="url(#createdFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="resolved"
            name="Resolucion"
            stroke="#10b981"
            fill="url(#resolvedFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
type MetricsPanelProps = {
  metrics: TicketsMetrics | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenHistoric: () => void;
};

function MetricsPanel({
  metrics,
  loading,
  error,
  onRefresh,
  onOpenHistoric,
}: MetricsPanelProps) {
  const showSkeleton = loading && !metrics;

  const resolveUserDisplayName = (
    item: TicketsMetrics["ticketsByUser"][number]
  ) => {
    if (!item) return "Sin usuario";

    const fullName = (item.userFullName ?? "").trim();
    if (fullName) return fullName;

    const firstName = (item.userName ?? "").trim();
    const lastName = (item.userLastName ?? "").trim();
    const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (combined) return combined;

    if (item.userId && item.userId.trim()) {
      return item.userId.trim();
    }

    return "Sin usuario";
  };

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
            {(metrics?.ticketsByUser ?? []).slice(0, 5).map((item) => {
              const displayName = resolveUserDisplayName(item);
              const key = `${item.userId || displayName || "desconocido"}-user`;
              return (
                <li key={key} className="flex justify-between text-neutral-300">
                  <span className="truncate pr-2" title={displayName}>
                    {displayName}
                  </span>
                  <span className="font-semibold text-neutral-100">
                    {item.total}
                  </span>
                </li>
              );
            })}
            {metrics && metrics.ticketsByUser.length === 0 && (
              <li className="text-neutral-500">Sin informacion disponible</li>
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <h4 className="text-sm text-neutral-400">Calificacion promedio</h4>
          <p className="mt-2 text-3xl font-bold text-amber-300">
            {formatRating(metrics?.ratingAvg ?? null)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Promedio general de calificaciones
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
          <h4 className="text-sm text-neutral-400">
            Calificacion por categoria
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-neutral-200">
            {(metrics?.ratingByCategory ?? []).slice(0, 4).map((item) => (
              <li
                key={item.category}
                className="flex items-center justify-between text-neutral-300"
              >
                <span className="truncate pr-2">{item.category}</span>
                <span className="font-semibold text-amber-200">
                  {formatRating(item.avg)}
                </span>
              </li>
            ))}
            {metrics && (metrics.ratingByCategory?.length ?? 0) === 0 && (
              <li className="text-neutral-500">Sin informacion disponible</li>
            )}
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-neutral-300">
            Evolucion mensual (ultimos 12 meses)
          </span>
          <div className="flex flex-wrap items-center gap-3">
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
            <button
              type="button"
              onClick={onOpenHistoric}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-white/10"
            >
              Ver historico completo
            </button>
          </div>
        </div>
        <TrendChart data={metrics?.trend ?? []} />
      </div>
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<
    "tickets" | "misAsignados" | "todos" | "metricas"
  >("todos");
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("todos");
  const [sortBy, setSortBy] = useState<SortOption>("createdAsc");
  const [unassignedView, setUnassignedView] = useState<
    "pendientes" | "resueltos"
  >("pendientes");
  const [myAssignedView, setMyAssignedView] = useState<
    "pendientes" | "resueltos"
  >("pendientes");
  const [allView, setAllView] = useState<"pendientes" | "resueltos">(
    "pendientes"
  );
  const [metrics, setMetrics] = useState<TicketsMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<{
    src: string;
    index: number;
    total: number;
  } | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Permisos de asignación
  const canAssignTickets =
    user?.nombreUsuario === "mcontreras" || user?.usuario === "mcontreras";
  const isAuthorizedUser = AUTHORIZED_USERS.includes(
    (user?.nombreUsuario || user?.usuario) as any
  );

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

  // Auto-refresh cada 30 segundos para mantener datos actualizados
  useEffect(() => {
    const interval = setInterval(() => {
      void refreshTickets();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshTickets]);

  const pendingTickets = useMemo(() => {
    // En la pestaña "Tickets" solo mostramos tickets sin asignar
    const pending = items.filter(
      (ticket) => ticket.state !== "resuelto" && !ticket.asignadoA
    );
    const filtered =
      riskFilter === "todos"
        ? pending
        : pending.filter((ticket) => ticket.risk === riskFilter);

    return sortTicketsByOption(filtered, sortBy, false);
  }, [items, riskFilter, sortBy]);
  const resolvedTickets = useMemo(() => {
    // En la pestaña "Tickets" solo mostramos tickets sin asignar
    const resolved = items.filter(
      (ticket) => ticket.state === "resuelto" && !ticket.asignadoA
    );
    const filtered =
      riskFilter === "todos"
        ? resolved
        : resolved.filter((ticket) => ticket.risk === riskFilter);

    return sortTicketsByOption(filtered, sortBy, true);
  }, [items, riskFilter, sortBy]);

  // Métricas de asignación por trabajador
  const assignmentMetrics = useMemo(() => {
    const workers = [
      { name: "Mauricio Contreras", value: "Mauricio Contreras" },
      { name: "Emerson Jiménez", value: "Emerson Jiménez" },
      { name: "Ignacio González", value: "Ignacio González" },
    ];

    return workers.map((worker) => {
      const assignedTickets = items.filter((t) => t.asignadoA === worker.value);
      const pending = assignedTickets.filter(
        (t) => t.state === "recibido"
      ).length;
      const inProgress = assignedTickets.filter(
        (t) => t.state === "enProceso" || t.state === "conDificultades"
      ).length;
      const resolved = assignedTickets.filter(
        (t) => t.state === "resuelto"
      ).length;

      return {
        name: worker.name,
        total: assignedTickets.length,
        pending,
        inProgress,
        resolved,
      };
    });
  }, [items]);

  // Tickets asignados al usuario actual
  const myAssignedTickets = useMemo(() => {
    const userFullName = `${user?.pnombre || ""} ${
      user?.papellido || ""
    }`.trim();
    const normalizedUserName = normalizeString(userFullName);

    return items.filter((t) => {
      if (!t.asignadoA) return false;
      return normalizeString(t.asignadoA) === normalizedUserName;
    });
  }, [items, user]);

  const myAssignedPending = useMemo(() => {
    return myAssignedTickets.filter((t) => t.state !== "resuelto").length;
  }, [myAssignedTickets]);

  const myAssignedResolved = useMemo(() => {
    const list = myAssignedTickets.filter((t) => t.state === "resuelto");
    return sortTicketsByOption(list, sortBy, true);
  }, [myAssignedTickets, sortBy]);

  const myAssignedPendingTickets = useMemo(() => {
    const list = myAssignedTickets.filter((t) => t.state !== "resuelto");
    return sortTicketsByOption(list, sortBy, false);
  }, [myAssignedTickets, sortBy]);

  // Contadores para los badges de las pestañas
  const allTicketsPendingCount = useMemo(() => {
    return items.filter((t) => t.state !== "resuelto").length;
  }, [items]);

  const allTicketsResolvedCount = useMemo(() => {
    return items.filter((t) => t.state === "resuelto").length;
  }, [items]);

  const unassignedPendingCount = useMemo(() => {
    return items.filter((t) => t.state !== "resuelto" && !t.asignadoA).length;
  }, [items]);

  const unassignedResolvedCount = useMemo(() => {
    return items.filter((t) => t.state === "resuelto" && !t.asignadoA).length;
  }, [items]);

  // Todos los tickets (asignados y sin asignar) - solo para pestaña "Todos"
  const allTicketsPending = useMemo(() => {
    const pending = items.filter((ticket) => ticket.state !== "resuelto");
    const filtered =
      riskFilter === "todos"
        ? pending
        : pending.filter((ticket) => ticket.risk === riskFilter);

    return sortTicketsByOption(filtered, sortBy, false);
  }, [items, riskFilter, sortBy]);

  const allTicketsResolved = useMemo(() => {
    const resolved = items.filter((ticket) => ticket.state === "resuelto");
    const filtered =
      riskFilter === "todos"
        ? resolved
        : resolved.filter((ticket) => ticket.risk === riskFilter);

    return sortTicketsByOption(filtered, sortBy, true);
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

  async function onAssign(ticket: Ticket, asignadoA: string) {
    setSaving((state) => ({ ...state, [ticket.ticketId]: true }));
    setError(null);
    const previousAssignee = ticket.asignadoA;

    try {
      // Actualización optimista
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId
            ? {
                ...item,
                asignadoA: asignadoA || undefined,
                fechaAsignacion: asignadoA
                  ? new Date().toISOString()
                  : undefined,
              }
            : item
        )
      );

      const response = await assignTicket(ticket.ticketId, asignadoA);
      if (!response.ok) {
        throw new Error(response.error || "No se pudo asignar el ticket.");
      }

      await refreshTickets();
    } catch (err: any) {
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId
            ? { ...item, asignadoA: previousAssignee }
            : item
        )
      );
      setError(err?.message || "Error asignando ticket.");
    } finally {
      setSaving((state) => ({ ...state, [ticket.ticketId]: false }));
    }
  }

  const renderTicketCard = (ticket: Ticket) => {
    const ownerFullName =
      (ticket.userFullName ?? "").trim() ||
      [ticket.userName ?? "", ticket.userLastName ?? ""]
        .filter(Boolean)
        .join(" ")
        .trim();
    const ownerDisplay =
      ownerFullName ||
      (ticket.userName ?? "").trim() ||
      ticket.userId ||
      "Sin usuario";

    // Verificar si el usuario actual es el asignado al ticket
    const userFullName = `${user?.pnombre || ""} ${
      user?.papellido || ""
    }`.trim();
    const isAssignedToCurrentUser = ticket.asignadoA
      ? normalizeString(ticket.asignadoA) === normalizeString(userFullName)
      : false;

    // Un ticket puede editarse solo si está asignado al usuario actual
    const canEditTicket = ticket.asignadoA && isAssignedToCurrentUser;

    return (
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
            <p className="mt-1 text-sm text-neutral-300">
              {ticket.description}
            </p>
            {Array.isArray(ticket.images) && ticket.images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ticket.images.map((src, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      setImageModal({
                        src,
                        index,
                        total: ticket.images!.length,
                      })
                    }
                    className="group relative h-24 w-full overflow-hidden rounded-lg border border-white/10 transition hover:border-orange-500/50"
                  >
                    <img
                      src={src}
                      alt={`img-${index}`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                      <span className="text-xs font-semibold text-white">
                        Ver imagen
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-neutral-400">
              {ownerDisplay} -{" "}
              {ticket.ticketTime
                ? new Date(ticket.ticketTime).toLocaleString()
                : "sin fecha"}
            </p>
          </div>
        </header>

        {!canEditTicket && ticket.asignadoA && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <p className="text-sm text-red-300">
              <span className="font-semibold">
                Ticket asignado a {ticket.asignadoA}
              </span>
            </p>
          </div>
        )}
        {!ticket.asignadoA && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <p className="text-sm text-amber-300">
              <span className="font-semibold">Ticket sin asignar:</span> Este
              ticket no puede editarse hasta que sea asignado a un trabajador.
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-400">Riesgo</span>
            <select
              aria-label="Cambiar riesgo"
              disabled={saving[ticket.ticketId] || !canEditTicket}
              value={ticket.risk}
              onChange={(event) =>
                onPatch(ticket, { risk: event.target.value as Ticket["risk"] })
              }
              className="block w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
              title={
                !canEditTicket
                  ? ticket.asignadoA
                    ? "Solo el usuario asignado puede editar este ticket"
                    : "El ticket debe estar asignado para poder editarlo"
                  : ""
              }
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
              disabled={saving[ticket.ticketId] || !canEditTicket}
              value={ticket.state}
              onChange={(event) =>
                onPatch(ticket, {
                  state: event.target.value as Ticket["state"],
                })
              }
              className="block w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
              title={
                !canEditTicket
                  ? ticket.asignadoA
                    ? "Solo el usuario asignado puede editar este ticket"
                    : "El ticket debe estar asignado para poder editarlo"
                  : ""
              }
            >
              {stateOpts.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isAuthorizedUser && (
          <div className="mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-400">Asignado a</span>
              <select
                aria-label="Asignar ticket"
                disabled={saving[ticket.ticketId] || !canAssignTickets}
                value={ticket.asignadoA || ""}
                onChange={(event) => onAssign(ticket, event.target.value)}
                className="block w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                title={
                  !canAssignTickets
                    ? "Solo Mauricio Contreras puede asignar tickets"
                    : ""
                }
              >
                {ASSIGN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {ticket.fechaAsignacion && (
                <span className="text-xs text-neutral-400">
                  Asignado: {new Date(ticket.fechaAsignacion).toLocaleString()}
                </span>
              )}
            </label>
          </div>
        )}

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
              placeholder={
                !canEditTicket
                  ? ticket.asignadoA
                    ? "Solo el usuario asignado puede agregar comentarios"
                    : "El ticket debe estar asignado para agregar comentarios"
                  : "Describe acciones realizadas, hallazgos o notas."
              }
              disabled={!canEditTicket}
              className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
            />
          </label>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSaveComment(ticket)}
              disabled={saving[ticket.ticketId] || !canEditTicket}
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold transition hover:bg-orange-500 disabled:opacity-60"
              title={
                !canEditTicket
                  ? ticket.asignadoA
                    ? "Solo el usuario asignado puede agregar comentarios"
                    : "El ticket debe estar asignado para poder agregar comentarios"
                  : ""
              }
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
  };

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
        <div className="relative mx-auto w-full max-w-screen-2xl space-y-6">
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

      <div className="relative mx-auto w-full max-w-screen-2xl">
        <AppHeader
          title="Gestión de tickets"
          subtitle="Administra y gestiona los tickets del sistema"
          backTo="/admin"
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
          {isAuthorizedUser && (
            <button
              type="button"
              onClick={() => setActiveTab("todos")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "todos"
                  ? "bg-orange-600 text-white"
                  : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              Todos{" "}
              {allTicketsPendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-sky-400 px-2 py-0.5 text-xs font-bold text-neutral-900">
                  {allTicketsPendingCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "tickets"
                ? "bg-orange-600 text-white"
                : "text-neutral-300 hover:bg-white/10"
            }`}
          >
            Sin Asignar{" "}
            {unassignedPendingCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-sky-400 px-2 py-0.5 text-xs font-bold text-neutral-900">
                {unassignedPendingCount}
              </span>
            )}
          </button>
          {isAuthorizedUser && (
            <button
              type="button"
              onClick={() => setActiveTab("misAsignados")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "misAsignados"
                  ? "bg-orange-600 text-white"
                  : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              Mis Tickets{" "}
              {myAssignedPending > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-sky-400 px-2 py-0.5 text-xs font-bold text-neutral-900">
                  {myAssignedPending}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("metricas")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "metricas"
                ? "bg-orange-600 text-white"
                : "text-neutral-300 hover:bg-white/10"
            }`}
          >
            Métricas
          </button>
        </div>

        {activeTab === "tickets" && (
          <>
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
            </div>

            <div className="mb-4 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setUnassignedView("pendientes")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  unassignedView === "pendientes"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Pendientes ({unassignedPendingCount})
              </button>
              <button
                type="button"
                onClick={() => setUnassignedView("resueltos")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  unassignedView === "resueltos"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Resueltos ({unassignedResolvedCount})
              </button>
            </div>

            {unassignedView === "pendientes" ? (
              pendingTickets.length === 0 && !loading ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                  No hay tickets pendientes.
                </div>
              ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pendingTickets.map(renderTicketCard)}
            </div>
          )
        ) : resolvedTickets.length === 0 && !loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
            No hay tickets resueltos con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resolvedTickets.map(renderTicketCard)}
          </div>
        )}
          </>
        )}

        {activeTab === "misAsignados" && (
          <>
            {/* Resumen de tickets asignados */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Mis Tickets Asignados
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Gestiona los tickets asignados a ti
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-500">
                    {myAssignedTickets.length}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Total asignados
                  </div>
                  {myAssignedPending > 0 && (
                    <div className="mt-1 text-sm font-semibold text-red-400">
                      {myAssignedPending} pendiente
                      {myAssignedPending !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMyAssignedView("pendientes")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  myAssignedView === "pendientes"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Pendientes ({myAssignedPendingTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setMyAssignedView("resueltos")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  myAssignedView === "resueltos"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Resueltos ({myAssignedResolved.length})
              </button>
            </div>

            {myAssignedView === "pendientes" ? (
              myAssignedPendingTickets.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300 text-center">
                  No tienes tickets pendientes asignados.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {myAssignedPendingTickets.map(renderTicketCard)}
                </div>
              )
            ) : myAssignedResolved.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300 text-center">
                No tienes tickets resueltos asignados.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {myAssignedResolved.map(renderTicketCard)}
              </div>
            )}
          </>
        )}
        {activeTab === "todos" && (
          <>
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
                    {Object.entries(SORT_LABEL).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mb-4 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setAllView("pendientes")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  allView === "pendientes"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Pendientes ({allTicketsPendingCount})
              </button>
              <button
                type="button"
                onClick={() => setAllView("resueltos")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  allView === "resueltos"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Resueltos ({allTicketsResolvedCount})
              </button>
            </div>

            {allView === "pendientes" ? (
              allTicketsPending.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                  No hay tickets pendientes con los filtros seleccionados.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {allTicketsPending.map(renderTicketCard)}
                </div>
              )
            ) : allTicketsResolved.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                No hay tickets resueltos con los filtros seleccionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {allTicketsResolved.map(renderTicketCard)}
              </div>
            )}
          </>
        )}

        {activeTab === "metricas" && (
          <>
            <MetricsPanel
              metrics={metrics}
              loading={metricsLoading}
              error={metricsError}
              onRefresh={() => {
                void refreshMetrics();
              }}
              onOpenHistoric={() => navigate("/admin/tickets/historico")}
            />

            {/* Métricas de asignación por trabajador */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
              <h3 className="text-xl font-bold mb-4">
                Tickets Asignados por Trabajador
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {assignmentMetrics.map((worker) => (
                  <div
                    key={worker.name}
                    className="rounded-xl border border-white/10 bg-neutral-900/50 p-4"
                  >
                    <h4 className="font-semibold text-lg mb-3">
                      {worker.name}
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">
                          Total asignados:
                        </span>
                        <span className="font-bold text-xl text-orange-500">
                          {worker.total}
                        </span>
                      </div>

                      <div className="h-px bg-white/10 my-3" />

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">
                          Pendientes:
                        </span>
                        <span className="font-semibold text-red-400">
                          {worker.pending}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">
                          En proceso:
                        </span>
                        <span className="font-semibold text-amber-400">
                          {worker.inProgress}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">
                          Resueltos:
                        </span>
                        <span className="font-semibold text-emerald-400">
                          {worker.resolved}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
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
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
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
