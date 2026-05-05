import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  listTicketsPaginated,
  patchTicket,
  assignTicket,
  requestTicketClosure,
  type Ticket,
  type TicketsMetrics,
} from "../services/tickets";
import { sendTicketEmail } from "../services/email";
import { useAuth } from "../auth/AuthContext";
import { canAssignTicketsByRole, isTicketAdmin } from "../auth/isTicketAdmin";
import AppHeader from "../components/AppHeader";
import { useCentroUsuarios } from "../features/gestion-activos/hooks/useCentroUsuarios";
import { Pagination } from "../features/gestion-activos/components/Pagination";
import {
  buildOptimisticPendingClosureTicket,
  DEFAULT_TICKET_CLOSURE_WINDOW_HOURS,
  formatTicketClosureRemaining,
  getTicketClosureRemainingMs,
  isTicketClosurePending,
} from "../utils/ticketClosure";
import {
  filtrarTicketsListosParaTi,
  obtenerClasesEstadoAprobacion,
  obtenerEtiquetaEstadoAprobacion,
} from "../utils/ticketApproval";

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

const ASSIGN_OPTIONS = [
  { value: "", label: "Sin asignar" },
  { value: "Mauricio Contreras", label: "Mauricio Contreras" },
  { value: "Emerson Jiménez", label: "Emerson Jiménez" },
  { value: "Ignacio González", label: "Ignacio González" },
] as const;

type SortOption = "risk" | "createdAsc" | "createdDesc" | "resolvedDesc";
type TicketEmailEvent =
  | "asignado"
  | "estado"
  | "resuelto"
  | "respuesta"
  | "cierreSolicitado";
type CreatorFilterOption = {
  userId: string;
  displayName: string;
};
type AssignmentMetric = {
  name: string;
  value: string;
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
};
const SORT_LABEL: Record<SortOption, string> = {
  risk: "Riesgo (alto -> bajo)",
  createdAsc: "Creacion (antiguo -> reciente)",
  createdDesc: "Creacion (reciente -> antiguo)",
  resolvedDesc: "Resuelto (reciente -> antiguo)",
};
const MAX_RESPONSE_IMAGES = 5;
const PAGE_SIZE = 12;
const METRICS_COMMENTS_PAGE_SIZE = 6;
const CREATOR_DATALIST_ID = "ticket-creator-options";
const CLOSURE_WINDOW_HOURS = DEFAULT_TICKET_CLOSURE_WINDOW_HOURS;
const ASSIGNMENT_WORKERS = ASSIGN_OPTIONS.filter(
  (option) => option.value
) as ReadonlyArray<{ value: string; label: string }>;

function getClosureBadgeClasses(ticket: Ticket) {
  if (ticket.closureStatus === "pending") {
    return "border-cyan-500/30 bg-cyan-500/15 text-cyan-200";
  }
  if (ticket.closureStatus === "accepted") {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
  }
  if (ticket.closureStatus === "expired") {
    return "border-neutral-500/30 bg-neutral-500/15 text-neutral-200";
  }
  if (ticket.closureStatus === "rejected") {
    return "border-amber-500/30 bg-amber-500/15 text-amber-200";
  }
  return "border-white/10 bg-white/5 text-neutral-200";
}

function getClosureBadgeLabel(ticket: Ticket, nowMs: number) {
  if (ticket.closureStatus === "pending") {
    const remainingMs = getTicketClosureRemainingMs(ticket, nowMs);
    if (remainingMs != null && remainingMs > 0) {
      return `Pendiente de confirmacion (${formatTicketClosureRemaining(
        remainingMs
      )})`;
    }
    return "Pendiente de confirmacion";
  }
  if (ticket.closureStatus === "accepted") return "Cierre aceptado";
  if (ticket.closureStatus === "expired") return "Cierre automatico";
  if (ticket.closureStatus === "rejected") return "Cierre rechazado";
  return "";
}

function mapSortOptionToBackend(sortBy: SortOption) {
  switch (sortBy) {
    case "risk":
      return "risk";
    case "createdAsc":
      return "createdAsc";
    case "createdDesc":
      return "createdDesc";
    case "resolvedDesc":
      return "resolvedDesc";
    default:
      return "createdAsc";
  }
}

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo seleccionado no es una imagen."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const sizeMb = file.size / (1024 * 1024);
        let maxDimension = 1920;
        let quality = 0.88;
        if (sizeMb > 5) {
          maxDimension = 1280;
          quality = 0.72;
        } else if (sizeMb > 2) {
          maxDimension = 1600;
          quality = 0.8;
        }

        let width = image.width;
        let height = image.height;
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("No se pudo procesar la imagen seleccionada."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = () => reject(new Error("No se pudo cargar la imagen seleccionada."));
      image.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveOwnerDisplay(ticket: Ticket) {
  const ownerFullName =
    (ticket.userFullName ?? "").trim() ||
    [ticket.userName ?? "", ticket.userLastName ?? ""]
      .filter(Boolean)
      .join(" ")
      .trim();
  return (
    ownerFullName ||
    (ticket.userName ?? "").trim() ||
    ticket.userId ||
    "Sin usuario"
  );
}

function buildCurrentUserAssigneeCandidates(user: {
  pnombre?: string;
  papellido?: string;
  primerNombre?: string;
  primerApellido?: string;
  nombreUsuario?: string;
  usuario?: string;
} | null | undefined) {
  if (!user) return [] as string[];

  const canonicalFull = [(user.pnombre || "").trim(), (user.papellido || "").trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  const aliasFull = [
    (user.primerNombre || "").trim(),
    (user.primerApellido || "").trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const candidates = [
    canonicalFull,
    aliasFull,
    (user.nombreUsuario || "").trim(),
    (user.usuario || "").trim(),
  ].filter(Boolean);

  const seen = new Set<string>();
  return candidates.filter((value) => {
    const key = normalizeString(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isAssigneeMatch(assigneeRaw: string | undefined, candidateRaw: string) {
  const assignee = normalizeString(assigneeRaw || "");
  const candidate = normalizeString(candidateRaw || "");
  if (!assignee || !candidate) return false;
  if (assignee === candidate) return true;
  const tokens = candidate.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => assignee.includes(token));
}

function isTicketAssignedToCandidates(ticket: Ticket, candidates: string[]) {
  if (!ticket.asignadoA || candidates.length === 0) return false;
  return candidates.some((candidate) => isAssigneeMatch(ticket.asignadoA, candidate));
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

function RatingStars({
  value,
  variant = "fractional",
}: {
  value: number | null | undefined;
  variant?: "fractional" | "discrete";
}) {
  const normalized =
    value == null || Number.isNaN(value)
      ? 0
      : Math.max(0, Math.min(value, 5));

  if (variant === "discrete") {
    const filledCount = Math.round(normalized);
    return (
      <div className="inline-flex items-center gap-1 text-lg leading-none">
        {Array.from({ length: 5 }).map((_, index) => {
          const isFilled = index < filledCount;
          return (
            <span
              key={index}
              className={isFilled ? "text-amber-500" : "text-white/15"}
            >
              ★
            </span>
          );
        })}
      </div>
    );
  }

  const percentage = `${(normalized / 5) * 100}%`;

  return (
    <div className="relative inline-flex text-lg leading-none tracking-[0.24em]">
      <span className="text-amber-200">★★★★★</span>
      <span
        className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-amber-500"
        style={{ width: percentage }}
      >
        ★★★★★
      </span>
    </div>
  );
}

function formatMetricCommentDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFeedbackToneClasses(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) {
    return {
      frame: "border-white/10 bg-white/[0.04]",
      badge: "border-white/10 bg-white/[0.06] text-neutral-200",
      meta: "text-neutral-200",
      accent: "from-white/20 to-transparent",
    };
  }

  if (score >= 4) {
    return {
      frame: "border-emerald-400/20 bg-emerald-500/[0.06]",
      badge: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
      meta: "text-neutral-100",
      accent: "from-emerald-300/50 to-transparent",
    };
  }

  if (score >= 3) {
    return {
      frame: "border-amber-400/20 bg-amber-500/[0.06]",
      badge: "border-amber-300/30 bg-amber-400/10 text-amber-200",
      meta: "text-neutral-100",
      accent: "from-amber-300/50 to-transparent",
    };
  }

  return {
    frame: "border-rose-400/20 bg-rose-500/[0.06]",
    badge: "border-rose-300/30 bg-rose-400/10 text-rose-200",
    meta: "text-neutral-100",
    accent: "from-rose-300/50 to-transparent",
  };
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
  const [commentsPage, setCommentsPage] = useState(1);
  const ratingComments = metrics?.ratingComments ?? [];
  const commentsTotalPages = Math.max(
    1,
    Math.ceil(ratingComments.length / METRICS_COMMENTS_PAGE_SIZE)
  );
  const commentsStartIndex = (commentsPage - 1) * METRICS_COMMENTS_PAGE_SIZE;
  const commentsEndIndex = commentsStartIndex + METRICS_COMMENTS_PAGE_SIZE;
  const commentsPageItems = ratingComments.slice(
    commentsStartIndex,
    commentsEndIndex
  );
  const commentsRangeStart = ratingComments.length
    ? commentsStartIndex + 1
    : 0;
  const commentsRangeEnd = ratingComments.length
    ? Math.min(commentsEndIndex, ratingComments.length)
    : 0;

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

  useEffect(() => {
    setCommentsPage(1);
  }, [ratingComments.length]);

  useEffect(() => {
    setCommentsPage((current) => Math.min(current, commentsTotalPages));
  }, [commentsTotalPages]);

  const timingMetrics = [
    {
      title: "Promedio de resolucion",
      value: formatResolutionTime(metrics?.avgResolutionTimeHours ?? null),
      toneValue: "text-neutral-100",
      description: "Desde apertura hasta cierre de ticket",
    },
    {
      title: "Creado → Asignado",
      value: formatResolutionTime(metrics?.avgCreatedToAssignedHours ?? null),
      toneValue: "text-sky-300",
      description: "Tiempo promedio desde creacion hasta asignacion",
    },
    {
      title: "Asignado → Resuelto",
      value: formatResolutionTime(metrics?.avgAssignedToResolvedHours ?? null),
      toneValue: "text-cyan-300",
      description: "Tiempo promedio desde asignacion hasta resolucion",
    },
    {
      title: "Cierre → Respuesta usuario",
      value: formatResolutionTime(
        metrics?.avgClosureRequestToResponseHours ?? null
      ),
      toneValue: "text-fuchsia-300",
      description: "Tiempo promedio desde solicitud de cierre hasta respuesta del usuario",
    },
  ] as const;

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {timingMetrics.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
          >
            <h4 className="text-sm text-neutral-400">{item.title}</h4>
            <p className={`mt-2 text-3xl font-bold ${item.toneValue}`}>
              {item.value}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{item.description}</p>
          </div>
        ))}
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
            {(metrics?.ticketsByUser ?? []).map((item) => {
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
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-amber-300">
                {formatRating(metrics?.ratingAvg ?? null)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Promedio general de calificaciones
              </p>
            </div>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
              {metrics?.ratingAvg != null && !Number.isNaN(metrics.ratingAvg)
                ? `${metrics.ratingAvg.toFixed(2)} / 5`
                : "Sin nota"}
            </span>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-100 via-orange-50 to-amber-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <RatingStars value={metrics?.ratingAvg ?? null} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">
                Satisfaccion
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-neutral-100">
              Comentarios anonimos de usuarios
            </h4>
            <p className="mt-1 text-sm leading-6 text-neutral-400">
              Retroalimentacion de tickets cerrados, sin datos personales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ratingComments.length > 0 && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-400">
                Mostrando {commentsRangeStart}-{commentsRangeEnd} de{" "}
                {ratingComments.length}
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-400">
              {ratingComments.length} comentarios
            </span>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {commentsPageItems.map((item, index) => {
            const formattedDate = formatMetricCommentDate(item.date);
            const tone = getFeedbackToneClasses(item.score);
            return (
              <article
                key={`${item.category}-${item.date || "sin-fecha"}-${
                  commentsStartIndex + index
                }`}
                className={`group relative overflow-hidden rounded-3xl border p-5 transition ${tone.frame}`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tone.accent}`}
                />
                <div className="absolute right-4 top-3 text-5xl font-serif leading-none text-white/5 transition group-hover:text-white/10">
                  "
                </div>

                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-300">
                      Anonimo
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                      {item.score != null ? `${item.score}/5` : "Sin nota"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] font-medium text-neutral-300">
                      {item.category || "Sin categoria"}
                    </span>
                  </div>
                  {formattedDate && (
                    <span className="text-xs text-neutral-500">{formattedDate}</span>
                  )}
                </div>

                <div className="relative mt-4 flex items-center justify-between gap-3">
                  <RatingStars value={item.score} variant="discrete" />
                  <span className={`text-[11px] font-medium uppercase tracking-[0.18em] ${tone.meta}`}>
                    Retroalimentacion
                  </span>
                </div>

                <p className="relative mt-4 whitespace-pre-wrap text-[15px] leading-7 text-neutral-100">
                  {item.comment}
                </p>
              </article>
            );
          })}
          {metrics && ratingComments.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-neutral-500 xl:col-span-2">
              Aun no hay comentarios de calificacion para mostrar.
            </div>
          )}
        </div>
        {ratingComments.length > METRICS_COMMENTS_PAGE_SIZE && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <Pagination
              currentPage={commentsPage}
              totalPages={commentsTotalPages}
              onPageChange={setCommentsPage}
              hasNextPage={commentsPage < commentsTotalPages}
              hasPrevPage={commentsPage > 1}
            />
          </div>
        )}
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
  const [responseImagesDraft, setResponseImagesDraft] = useState<
    Record<string, string[]>
  >({});
  const [compressingResponseImages, setCompressingResponseImages] = useState<
    Record<string, boolean>
  >({});
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("todos");
  const [sortBy, setSortBy] = useState<SortOption>("createdAsc");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [unassignedView, setUnassignedView] = useState<
    "pendientes" | "resueltos"
  >("pendientes");
  const [myAssignedView, setMyAssignedView] = useState<
    "pendientes" | "resueltos"
  >("pendientes");
  const [allView, setAllView] = useState<"pendientes" | "resueltos">(
    "pendientes"
  );
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [myAssignedPage, setMyAssignedPage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [unassignedPageItems, setUnassignedPageItems] = useState<Ticket[]>([]);
  const [myAssignedPageItems, setMyAssignedPageItems] = useState<Ticket[]>([]);
  const [allPageItems, setAllPageItems] = useState<Ticket[]>([]);
  const [unassignedTotalCount, setUnassignedTotalCount] = useState(0);
  const [myAssignedTotalCount, setMyAssignedTotalCount] = useState(0);
  const [allTotalCount, setAllTotalCount] = useState(0);
  const [unassignedListLoading, setUnassignedListLoading] = useState(false);
  const [myAssignedListLoading, setMyAssignedListLoading] = useState(false);
  const [allListLoading, setAllListLoading] = useState(false);
  const [unassignedPendingCountServer, setUnassignedPendingCountServer] =
    useState(0);
  const [unassignedResolvedCountServer, setUnassignedResolvedCountServer] =
    useState(0);
  const [myAssignedPendingCountServer, setMyAssignedPendingCountServer] =
    useState(0);
  const [myAssignedResolvedCountServer, setMyAssignedResolvedCountServer] =
    useState(0);
  const [allPendingCountServer, setAllPendingCountServer] = useState(0);
  const [allResolvedCountServer, setAllResolvedCountServer] = useState(0);
  const [assignmentMetrics, setAssignmentMetrics] = useState<AssignmentMetric[]>(
    () =>
      ASSIGNMENT_WORKERS.map((worker) => ({
        name: worker.label,
        value: worker.value,
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
      }))
  );
  const [metrics, setMetrics] = useState<TicketsMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [focusedTicketId, setFocusedTicketId] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<{
    src: string;
    index: number;
    total: number;
  } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const ticketsStartRef = useRef<HTMLDivElement | null>(null);
  const { usuarios: centroUsuarios } = useCentroUsuarios();

  const { user } = useAuth();
  const navigate = useNavigate();
  const assignedUserCandidates = useMemo(
    () => buildCurrentUserAssigneeCandidates(user),
    [
      user?.pnombre,
      user?.papellido,
      user?.primerNombre,
      user?.primerApellido,
      user?.nombreUsuario,
      user?.usuario,
    ]
  );
  const creatorFilterOptions = useMemo<CreatorFilterOption[]>(() => {
    const source = metrics?.ticketsByUser || [];
    return source
      .map((item) => ({
        userId: (item.userId || "").trim(),
        displayName: (
          item.userFullName ||
          [item.userName || "", item.userLastName || ""].filter(Boolean).join(" ") ||
          item.userId
        ).trim(),
      }))
      .filter((item) => item.userId)
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "es", {
          sensitivity: "base",
        })
      );
  }, [metrics?.ticketsByUser]);
  const creatorFilterUserId = useMemo(() => {
    const value = creatorFilter.trim();
    if (!value) return "";
    const normalizedValue = normalizeString(value);
    const exactMatch = creatorFilterOptions.find(
      (option) =>
        normalizeString(option.userId) === normalizedValue ||
        normalizeString(option.displayName) === normalizedValue
    );
    return exactMatch?.userId || value;
  }, [creatorFilter, creatorFilterOptions]);

  const scrollToTicketsStart = useCallback(() => {
    const target = ticketsStartRef.current;
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }, []);

  const handleUnassignedPageChange = useCallback(
    (page: number) => {
      setUnassignedPage(page);
      requestAnimationFrame(scrollToTicketsStart);
    },
    [scrollToTicketsStart]
  );

  const handleMyAssignedPageChange = useCallback(
    (page: number) => {
      setMyAssignedPage(page);
      requestAnimationFrame(scrollToTicketsStart);
    },
    [scrollToTicketsStart]
  );

  const handleAllPageChange = useCallback(
    (page: number) => {
      setAllPage(page);
      requestAnimationFrame(scrollToTicketsStart);
    },
    [scrollToTicketsStart]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const isAuthorizedUser = isTicketAdmin(user || undefined);
  const canAssignTickets = canAssignTicketsByRole(user || undefined);

  const correoPorUsuario = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of centroUsuarios) {
      const key = (u.usuario || "").trim().toLowerCase();
      const email = (u.email || "").trim();
      if (key && email && !map.has(key)) {
        map.set(key, email);
      }
    }
    return map;
  }, [centroUsuarios]);

  const resolveCorreo = useCallback(
    (userId?: string) => {
      if (!userId) return "";
      return correoPorUsuario.get(userId.trim().toLowerCase()) || "";
    },
    [correoPorUsuario]
  );

  const notifyTicketByEmail = useCallback(
    async (
      ticket: Ticket,
      evento: TicketEmailEvent,
      extras?: {
        newState?: Ticket["state"];
        assignedTo?: string;
        prevState?: Ticket["state"];
        responseComment?: string;
        responseImagesCount?: number;
      }
    ) => {
      const destinatario = resolveCorreo(ticket.userId);
      if (!destinatario) {
        console.warn(
          `[email] sin correo para usuario '${ticket.userId}' en centro de aplicaciones`
        );
        return;
      }

      const ownerDisplay = resolveOwnerDisplay(ticket);
      const assignedTo = extras?.assignedTo || ticket.asignadoA || "Sin asignar";
      const state = extras?.newState || ticket.state;
      const fecha = new Date().toLocaleString("es-CL");
      const prevState = extras?.prevState;
      const responseComment = extras?.responseComment?.trim() || "";
      const responseImagesCount = extras?.responseImagesCount ?? 0;

      let asunto = "";
      let mensaje = "";
      const detailLines = [
        `Ticket: ${ticket.ticketId}`,
        `Categoria: ${ticket.title}`,
        `Estado: ${state}`,
        prevState ? `Estado anterior: ${prevState}` : "",
        `Riesgo: ${ticket.risk}`,
        `Asignado a: ${assignedTo}`,
        `Fecha: ${fecha}`,
      ].filter(Boolean);
      const description = ticket.description
        ? `Descripcion: ${ticket.description}`
        : "";

      if (evento === "asignado") {
        asunto = `Ticket ${ticket.ticketId} asignado`;
        mensaje = [
          `Hola ${ownerDisplay},`,
          "",
          "Tu ticket fue asignado a un trabajador.",
          "",
          ...detailLines,
          description,
          "",
          "Sistema de Tickets VVP.",
        ].filter(Boolean).join("\n");
      } else if (evento === "cierreSolicitado") {
        asunto = `Ticket ${ticket.ticketId} pendiente de tu confirmacion`;
        mensaje = [
          `Hola ${ownerDisplay},`,
          "",
          "Tu ticket fue marcado como resuelto por TI y entro en etapa de cierre.",
          `Tienes ${CLOSURE_WINDOW_HOURS} horas para confirmar si la solucion fue correcta.`,
          "Si no respondes dentro del plazo, el ticket se cerrara automaticamente.",
          "",
          ...detailLines,
          description,
          "",
          "Sistema de Tickets VVP.",
        ].filter(Boolean).join("\n");
      } else if (evento === "resuelto") {
        asunto = `Ticket ${ticket.ticketId} resuelto`;
        mensaje = [
          `Hola ${ownerDisplay},`,
          "",
          "Tu ticket fue marcado como resuelto.",
          "",
          ...detailLines,
          description,
          "",
          "Sistema de Tickets VVP.",
        ].filter(Boolean).join("\n");
      } else if (evento === "respuesta") {
        asunto = `Ticket ${ticket.ticketId} con nueva respuesta TI`;
        mensaje = [
          `Hola ${ownerDisplay},`,
          "",
          "Tu ticket recibió una nueva respuesta de TI.",
          responseComment ? `Comentario: ${responseComment}` : "",
          responseImagesCount > 0
            ? `Imagenes adjuntas en respuesta: ${responseImagesCount}`
            : "",
          "",
          ...detailLines,
          description,
          "",
          "Sistema de Tickets VVP.",
        ].filter(Boolean).join("\n");
      } else {
        asunto = `Ticket ${ticket.ticketId} actualizado`;
        mensaje = [
          `Hola ${ownerDisplay},`,
          "",
          `Tu ticket cambió de estado a "${state}".`,
          "",
          ...detailLines,
          description,
          "",
          "Sistema de Tickets VVP.",
        ].filter(Boolean).join("\n");
      }

      const nota = {
        origen: "ticket",
        ticketId: ticket.ticketId,
        title: ticket.title,
        state,
        risk: ticket.risk,
        asignadoA: assignedTo,
        userId: ticket.userId,
        userName: ownerDisplay,
        description: ticket.description,
        fecha,
        evento,
        responseComment: responseComment || undefined,
        responseImagesCount: responseImagesCount || undefined,
      };

      try {
        const response = await sendTicketEmail({
          destinatario,
          asunto,
          mensaje,
          nota,
        });
        if (!response.ok) {
          console.warn("[email] envio fallido:", response.error);
        }
      } catch (err) {
        console.warn("[email] error enviando correo:", err);
      }
    },
    [resolveCorreo]
  );

  const fetchPagedCount = useCallback(
    async (params: Parameters<typeof listTicketsPaginated>[0]) => {
      const response = await listTicketsPaginated({
        ...params,
        soloListosTi: true,
        limit: 1,
        skip: 0,
      });
      if (!response.ok) {
        throw new Error(response.error || "No se pudieron obtener conteos.");
      }
      return response.count ?? 0;
    },
    []
  );

  const refreshServerCounts = useCallback(async () => {
    try {
      const [unassignedPending, unassignedResolved, allPending, allResolved] =
        await Promise.all([
          fetchPagedCount({ unassigned: true, excludeState: "resuelto" }),
          fetchPagedCount({ unassigned: true, state: "resuelto" }),
          fetchPagedCount({ excludeState: "resuelto" }),
          fetchPagedCount({ state: "resuelto" }),
        ]);

      setUnassignedPendingCountServer(unassignedPending);
      setUnassignedResolvedCountServer(unassignedResolved);
      setAllPendingCountServer(allPending);
      setAllResolvedCountServer(allResolved);

      if (assignedUserCandidates.length === 0) {
        setMyAssignedPendingCountServer(0);
        setMyAssignedResolvedCountServer(0);
        return;
      }

      const [myPending, myResolved] = await Promise.all([
        fetchPagedCount({
          asignadoAAny: assignedUserCandidates,
          excludeState: "resuelto",
        }),
        fetchPagedCount({
          asignadoAAny: assignedUserCandidates,
          state: "resuelto",
        }),
      ]);

      setMyAssignedPendingCountServer(myPending);
      setMyAssignedResolvedCountServer(myResolved);
    } catch (err: any) {
      setError(err?.message || "No se pudieron obtener conteos de tickets.");
    }
  }, [assignedUserCandidates, fetchPagedCount]);

  const fetchUnassignedPage = useCallback(async () => {
    try {
      setUnassignedListLoading(true);
      const params: Parameters<typeof listTicketsPaginated>[0] = {
        unassigned: true,
        soloListosTi: true,
        sortBy: mapSortOptionToBackend(sortBy),
        limit: PAGE_SIZE,
        skip: (unassignedPage - 1) * PAGE_SIZE,
      };

      if (creatorFilterUserId) {
        params.userId = creatorFilterUserId;
      }
      if (riskFilter !== "todos") {
        params.risk = riskFilter;
      }
      if (unassignedView === "resueltos") {
        params.state = "resuelto";
      } else {
        params.excludeState = "resuelto";
      }

      const response = await listTicketsPaginated(params);
      if (!response.ok) {
        throw new Error(response.error || "No se pudieron cargar tickets.");
      }
      const data = Array.isArray(response.data) ? response.data : [];
      setUnassignedPageItems(filtrarTicketsListosParaTi(data));
      setUnassignedTotalCount(response.count ?? 0);
    } catch (err: any) {
      setError(err?.message || "Error al paginar tickets sin asignar.");
    } finally {
      setUnassignedListLoading(false);
    }
  }, [creatorFilterUserId, riskFilter, sortBy, unassignedPage, unassignedView]);

  const fetchMyAssignedPage = useCallback(async () => {
    if (assignedUserCandidates.length === 0) {
      setMyAssignedPageItems([]);
      setMyAssignedTotalCount(0);
      return;
    }

    try {
      setMyAssignedListLoading(true);
      const params: Parameters<typeof listTicketsPaginated>[0] = {
        soloListosTi: true,
        asignadoAAny: assignedUserCandidates,
        sortBy: mapSortOptionToBackend(sortBy),
        limit: PAGE_SIZE,
        skip: (myAssignedPage - 1) * PAGE_SIZE,
      };

      if (creatorFilterUserId) {
        params.userId = creatorFilterUserId;
      }

      if (myAssignedView === "resueltos") {
        params.state = "resuelto";
      } else {
        params.excludeState = "resuelto";
      }

      const response = await listTicketsPaginated(params);
      if (!response.ok) {
        throw new Error(response.error || "No se pudieron cargar tickets.");
      }

      const data = Array.isArray(response.data) ? response.data : [];
      setMyAssignedPageItems(filtrarTicketsListosParaTi(data));
      setMyAssignedTotalCount(response.count ?? 0);
    } catch (err: any) {
      setError(err?.message || "Error al paginar mis tickets asignados.");
    } finally {
      setMyAssignedListLoading(false);
    }
  }, [
    assignedUserCandidates,
    creatorFilterUserId,
    myAssignedPage,
    myAssignedView,
    sortBy,
  ]);

  const fetchAllPage = useCallback(async () => {
    try {
      setAllListLoading(true);
      const params: Parameters<typeof listTicketsPaginated>[0] = {
        soloListosTi: true,
        sortBy: mapSortOptionToBackend(sortBy),
        limit: PAGE_SIZE,
        skip: (allPage - 1) * PAGE_SIZE,
      };

      if (creatorFilterUserId) {
        params.userId = creatorFilterUserId;
      }
      if (riskFilter !== "todos") {
        params.risk = riskFilter;
      }
      if (allView === "resueltos") {
        params.state = "resuelto";
      } else {
        params.excludeState = "resuelto";
      }

      const response = await listTicketsPaginated(params);
      if (!response.ok) {
        throw new Error(response.error || "No se pudieron cargar tickets.");
      }
      const data = Array.isArray(response.data) ? response.data : [];
      setAllPageItems(filtrarTicketsListosParaTi(data));
      setAllTotalCount(response.count ?? 0);
    } catch (err: any) {
      setError(err?.message || "Error al paginar todos los tickets.");
    } finally {
      setAllListLoading(false);
    }
  }, [allPage, allView, creatorFilterUserId, riskFilter, sortBy]);

  const refreshActiveTabPage = useCallback(async () => {
    if (activeTab === "tickets") {
      await fetchUnassignedPage();
      return;
    }
    if (activeTab === "misAsignados") {
      await fetchMyAssignedPage();
      return;
    }
    if (activeTab === "todos") {
      await fetchAllPage();
    }
  }, [activeTab, fetchAllPage, fetchMyAssignedPage, fetchUnassignedPage]);

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

  const refreshAssignmentMetrics = useCallback(async () => {
    try {
      const resultados = await Promise.all(
        ASSIGNMENT_WORKERS.map(async (worker) => {
          const [pending, inProgress, resolved] = await Promise.all([
            fetchPagedCount({
              asignadoA: worker.value,
              state: "recibido",
            }),
            fetchPagedCount({
              asignadoA: worker.value,
              states: ["enProceso", "conDificultades"],
            }),
            fetchPagedCount({
              asignadoA: worker.value,
              state: "resuelto",
            }),
          ]);

          return {
            name: worker.label,
            value: worker.value,
            pending,
            inProgress,
            resolved,
            total: pending + inProgress + resolved,
          };
        })
      );

      setAssignmentMetrics(resultados);
    } catch (err: any) {
      setError(
        err?.message || "No se pudieron obtener las metricas por trabajador."
      );
    }
  }, [fetchPagedCount]);

  useEffect(() => {
    void refreshMetrics();
    void refreshAssignmentMetrics();
  }, [refreshAssignmentMetrics, refreshMetrics]);

  useEffect(() => {
    void refreshServerCounts();
  }, [refreshServerCounts]);

  // Auto-refresh cada 30 segundos para mantener datos actualizados
  useEffect(() => {
    const interval = setInterval(() => {
      void refreshServerCounts();
      void refreshActiveTabPage();
      void refreshAssignmentMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshActiveTabPage, refreshAssignmentMetrics, refreshServerCounts]);

  const myAssignedTotalCountServer = useMemo(
    () => myAssignedPendingCountServer + myAssignedResolvedCountServer,
    [myAssignedPendingCountServer, myAssignedResolvedCountServer]
  );

  const unassignedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(unassignedTotalCount / PAGE_SIZE)),
    [unassignedTotalCount]
  );
  const myAssignedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(myAssignedTotalCount / PAGE_SIZE)),
    [myAssignedTotalCount]
  );
  const allTotalPages = useMemo(
    () => Math.max(1, Math.ceil(allTotalCount / PAGE_SIZE)),
    [allTotalCount]
  );

  useEffect(() => {
    setUnassignedPage(1);
  }, [unassignedView, creatorFilterUserId, riskFilter, sortBy]);

  useEffect(() => {
    setMyAssignedPage(1);
  }, [myAssignedView, creatorFilterUserId, sortBy]);

  useEffect(() => {
    setAllPage(1);
  }, [allView, creatorFilterUserId, riskFilter, sortBy]);

  useEffect(() => {
    setUnassignedPage((page) => Math.min(page, unassignedTotalPages));
  }, [unassignedTotalPages]);

  useEffect(() => {
    setMyAssignedPage((page) => Math.min(page, myAssignedTotalPages));
  }, [myAssignedTotalPages]);

  useEffect(() => {
    setAllPage((page) => Math.min(page, allTotalPages));
  }, [allTotalPages]);

  useEffect(() => {
    void fetchUnassignedPage();
  }, [fetchUnassignedPage]);

  useEffect(() => {
    void fetchMyAssignedPage();
  }, [fetchMyAssignedPage]);

  useEffect(() => {
    void fetchAllPage();
  }, [fetchAllPage]);

  useEffect(() => {
    setLoading(
      metricsLoading ||
        unassignedListLoading ||
        myAssignedListLoading ||
        allListLoading
    );
  }, [allListLoading, metricsLoading, myAssignedListLoading, unassignedListLoading]);

  const ticketsPool = useMemo(
    () => [
      ...unassignedPageItems,
      ...myAssignedPageItems,
      ...allPageItems,
      ...items,
    ],
    [allPageItems, items, myAssignedPageItems, unassignedPageItems]
  );

  const focusedTicket = useMemo(
    () =>
      focusedTicketId
        ? ticketsPool.find((ticket) => ticket.ticketId === focusedTicketId) ||
          null
        : null,
    [focusedTicketId, ticketsPool]
  );

  useEffect(() => {
    if (!focusedTicketId) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFocusedTicketId(null);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [focusedTicketId]);

  const getResponseImagesDraft = useCallback(
    (ticket: Ticket) => {
      if (Object.prototype.hasOwnProperty.call(responseImagesDraft, ticket.ticketId)) {
        return responseImagesDraft[ticket.ticketId] ?? [];
      }
      return Array.isArray(ticket.imagesRespuesta) ? ticket.imagesRespuesta : [];
    },
    [responseImagesDraft]
  );

  async function onResponseImageFilesSelected(ticket: Ticket, files: File[]) {
    if (!files.length) return;
    const currentImages = getResponseImagesDraft(ticket);
    const remainingSlots = MAX_RESPONSE_IMAGES - currentImages.length;
    if (remainingSlots <= 0) {
      setError(
        `Solo puedes adjuntar hasta ${MAX_RESPONSE_IMAGES} imagenes en la respuesta TI.`
      );
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    setCompressingResponseImages((state) => ({ ...state, [ticket.ticketId]: true }));
    setError(null);

    try {
      const compressed = await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            return await compressImageToDataUrl(file);
          } catch (err) {
            console.error("No se pudo comprimir imagen de respuesta:", err);
            return "";
          }
        })
      );

      const validImages = compressed.filter(Boolean);
      if (validImages.length) {
        setResponseImagesDraft((state) => ({
          ...state,
          [ticket.ticketId]: [...currentImages, ...validImages],
        }));
      }
      if (validImages.length < selectedFiles.length) {
        setError(
          `${selectedFiles.length - validImages.length} imagen(es) de respuesta no pudieron procesarse.`
        );
      }
    } catch {
      setError("No se pudieron procesar las imagenes de respuesta.");
    } finally {
      setCompressingResponseImages((state) => ({
        ...state,
        [ticket.ticketId]: false,
      }));
    }
  }

  async function onResponseImagesSelected(ticket: Ticket, files: FileList | null) {
    if (!files?.length) return;
    await onResponseImageFilesSelected(ticket, Array.from(files));
  }

  function onRemoveResponseImage(ticket: Ticket, imageIndex: number) {
    const currentImages = getResponseImagesDraft(ticket);
    setResponseImagesDraft((state) => ({
      ...state,
      [ticket.ticketId]: currentImages.filter((_, index) => index !== imageIndex),
    }));
  }

  async function onPatch(
    ticket: Ticket,
    patch: Partial<Pick<Ticket, "risk" | "state">>
  ) {
    setSaving((state) => ({ ...state, [ticket.ticketId]: true }));
    setError(null);
    const previous = { ...ticket };
    const requestingClosure =
      patch.state === "resuelto" &&
      previous.state !== "resuelto" &&
      !isTicketClosurePending(previous);
    const optimisticTicket = requestingClosure
      ? buildOptimisticPendingClosureTicket(previous, CLOSURE_WINDOW_HOURS)
      : { ...previous, ...patch };

    try {
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId ? optimisticTicket : item
        )
      );
      const response = requestingClosure
        ? await requestTicketClosure(ticket.ticketId, {
            windowHours: CLOSURE_WINDOW_HOURS,
          })
        : await patchTicket(ticket.ticketId, patch);
      if (!response.ok) {
        throw new Error(response.error || "No se pudo actualizar el ticket.");
      }
      const updatedTicket = { ...optimisticTicket, ...(response.data || {}) };
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId ? updatedTicket : item
        )
      );
      if (patch.state && patch.state !== previous.state) {
        const evento: TicketEmailEvent = requestingClosure
          ? "cierreSolicitado"
          : patch.state === "resuelto"
            ? "resuelto"
            : "estado";
        void notifyTicketByEmail(updatedTicket, evento, {
          newState: patch.state,
          prevState: previous.state,
        });
      }
      if (patch.state === "resuelto") {
        setCommentDraft((draft) => {
          if (!(ticket.ticketId in draft)) return draft;
          const { [ticket.ticketId]: _omit, ...rest } = draft;
          return rest;
        });
      }
      await refreshActiveTabPage();
      void refreshServerCounts();
      void refreshMetrics();
      void refreshAssignmentMetrics();
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
    const draftImages = getResponseImagesDraft(ticket);
    setSaving((state) => ({ ...state, [ticket.ticketId]: true }));
    setError(null);
    const previousComment = ticket.comment ?? "";
    const previousResponseImages = Array.isArray(ticket.imagesRespuesta)
      ? ticket.imagesRespuesta
      : [];
    const normalizedDraftComment = draft.trim();
    const normalizedPreviousComment = previousComment.trim();
    const hasNewComment =
      normalizedDraftComment.length > 0 &&
      normalizedDraftComment !== normalizedPreviousComment;
    const previousResponseImagesSet = new Set(previousResponseImages);
    const hasNewResponseImages = draftImages.some(
      (image) => !previousResponseImagesSet.has(image)
    );

    try {
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId
            ? { ...item, comment: draft, imagesRespuesta: draftImages }
            : item
        )
      );
      const response = await patchTicket(ticket.ticketId, {
        comment: draft,
        imagesRespuesta: draftImages,
      });
      if (!response.ok) {
        throw new Error(response.error || "No se pudo guardar la respuesta TI.");
      }
      if (hasNewComment || hasNewResponseImages) {
        const updatedTicket = { ...ticket, comment: draft, imagesRespuesta: draftImages };
        void notifyTicketByEmail(updatedTicket, "respuesta", {
          responseComment: normalizedDraftComment,
          responseImagesCount: draftImages.length,
        });
      }
      await refreshActiveTabPage();
    } catch (err: any) {
      setItems((list) =>
        list.map((item) =>
          item.ticketId === ticket.ticketId
            ? {
                ...item,
                comment: previousComment,
                imagesRespuesta: previousResponseImages,
              }
            : item
        )
      );
      setError(err?.message || "Error guardando la respuesta TI.");
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

      if (asignadoA) {
        const updatedTicket = {
          ...ticket,
          asignadoA,
          fechaAsignacion: new Date().toISOString(),
        };
        void notifyTicketByEmail(updatedTicket, "asignado", {
          assignedTo: asignadoA,
        });
      }

      await refreshActiveTabPage();
      void refreshServerCounts();
      void refreshAssignmentMetrics();
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

  const renderTicketCard = (ticket: Ticket, mode: "grid" | "focus" = "grid") => {
    const isFocusMode = mode === "focus";
    const ownerDisplay = resolveOwnerDisplay(ticket);

    // Verificar si el usuario actual es el asignado al ticket
    const isAssignedToCurrentUser = isTicketAssignedToCandidates(
      ticket,
      assignedUserCandidates
    );

    // Un ticket puede editarse solo si está asignado al usuario actual
    const canEditTicket = Boolean(ticket.asignadoA && isAssignedToCurrentUser);
    const requestImages = Array.isArray(ticket.images) ? ticket.images : [];
    const responseImages = getResponseImagesDraft(ticket);
    const responseComment = commentDraft[ticket.ticketId] ?? ticket.comment ?? "";
    const hasResponseContent =
      Boolean(responseComment.trim()) || responseImages.length > 0;
    const closurePending = isTicketClosurePending(ticket);
    const closureRejected = ticket.closureStatus === "rejected";
    const closureRemainingMs = getTicketClosureRemainingMs(ticket, nowMs);
    const closureBadgeLabel = getClosureBadgeLabel(ticket, nowMs);
    const closureRejectionComment = (
      ticket.closureResponseComment || ""
    ).trim();
    const approvalBadgeLabel = obtenerEtiquetaEstadoAprobacion(
      ticket.estadoAprobacion
    );
    const approvalBadgeClasses = obtenerClasesEstadoAprobacion(
      ticket.estadoAprobacion
    );

    return (
      <article
        key={ticket.ticketId}
        className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ${
          RISK_RING[ticket.risk]
        } transition ${
          isFocusMode
            ? "mx-auto w-full max-w-[1450px] rounded-3xl border border-white/20 bg-neutral-900/35 p-6 ring-1 ring-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.65)] md:p-8"
            : "cursor-pointer p-5 hover:bg-white/10"
        }`}
        onClick={(event) => {
          if (isFocusMode) return;
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, select, textarea, label")) return;
          setFocusedTicketId(ticket.ticketId);
        }}
        onKeyDown={
          isFocusMode
            ? undefined
            : (event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button, a, input, select, textarea, label")) {
                  return;
                }
                if (
                  event.key === "Enter" ||
                  event.key === " " ||
                  event.key === "Spacebar"
                ) {
                  event.preventDefault();
                  setFocusedTicketId(ticket.ticketId);
                }
              }
        }
        role={isFocusMode ? undefined : "button"}
        tabIndex={isFocusMode ? undefined : 0}
      >
        <div className={isFocusMode ? "mx-auto w-full max-w-5xl" : ""}>
        <header
          className={`flex items-start justify-between gap-4 ${
            isFocusMode ? "border-b border-white/10 pb-4" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={`text-lg font-semibold ${
                  isFocusMode ? "text-xl md:text-2xl" : "truncate"
                }`}
              >
                {ticket.title}
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  RISK_BADGE[ticket.risk]
                }`}
              >
                {ticket.risk}
              </span>
              {closureBadgeLabel && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getClosureBadgeClasses(
                    ticket
                  )}`}
                >
                  {closureBadgeLabel}
                </span>
              )}
              {approvalBadgeLabel && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${approvalBadgeClasses}`}
                >
                  {approvalBadgeLabel}
                </span>
              )}
            </div>
            <p
              className={`mt-1 text-sm text-neutral-300 ${
                isFocusMode ? "mx-auto max-w-5xl text-base leading-relaxed" : ""
              }`}
            >
              ID: {ticket.ticketId}
            </p>
            <p
              className={`mt-1 text-xs text-neutral-400 ${
                isFocusMode ? "text-sm" : ""
              }`}
            >
              {ownerDisplay} -{" "}
              {ticket.ticketTime
                ? new Date(ticket.ticketTime).toLocaleString()
                : "sin fecha"}
            </p>
            {closurePending && (
              <div className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                <p>
                  El ticket esta esperando confirmacion del usuario para cerrar.
                </p>
                <p className="mt-1 text-xs text-cyan-100/80">
                  {closureRemainingMs != null && closureRemainingMs > 0
                    ? `Cierre automatico en ${formatTicketClosureRemaining(
                        closureRemainingMs
                      )}.`
                  : "El plazo de confirmacion ya vencio; el backend debe cerrarlo automaticamente."}
                </p>
              </div>
            )}
            {closureRejected && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-semibold">
                  El usuario rechazo el cierre y el ticket sigue en proceso.
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  {closureRejectionComment ||
                    "No se registro un motivo para mantener el ticket abierto."}
                </p>
              </div>
            )}
            {ticket.estadoAprobacion === "aprobado" && (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                <p>El ticket fue aprobado por jefatura y ya esta habilitado para TI.</p>
              </div>
            )}

            <div
              className={`mt-4 grid grid-cols-1 gap-3 ${
                isFocusMode ? "mx-auto max-w-5xl lg:grid-cols-2" : ""
              }`}
            >
              <section className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                  Solicitud del usuario
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">
                  {ticket.description}
                </p>
                {requestImages.length > 0 ? (
                  <div
                    className={`mt-3 gap-3 ${
                      isFocusMode
                        ? "grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
                        : "grid grid-cols-2 sm:grid-cols-3"
                    }`}
                  >
                    {requestImages.map((src, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          setImageModal({
                            src,
                            index,
                            total: requestImages.length,
                          })
                        }
                        className={`group relative w-full overflow-hidden rounded-xl border border-white/10 transition hover:border-sky-400/60 ${
                          isFocusMode
                            ? "h-40 bg-neutral-950/40 shadow-[0_8px_25px_rgba(0,0,0,0.4)]"
                            : "h-24"
                        }`}
                      >
                        <img
                          src={src}
                          alt={`ticket-${index}`}
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
                ) : (
                  <p className="mt-3 text-xs text-sky-100/80">Sin imagenes adjuntas.</p>
                )}
              </section>

              <section className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-200">
                  Respuesta TI
                </p>
                {hasResponseContent ? (
                  <>
                    {responseComment.trim() ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-neutral-200">
                        {responseComment}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-neutral-400">
                        Sin comentario de respuesta.
                      </p>
                    )}

                    {responseImages.length > 0 && (
                      <div
                        className={`mt-3 gap-3 ${
                          isFocusMode
                            ? "grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
                            : "grid grid-cols-2 sm:grid-cols-3"
                        }`}
                      >
                        {responseImages.map((src, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() =>
                              setImageModal({
                                src,
                                index,
                                total: responseImages.length,
                              })
                            }
                            className={`group relative w-full overflow-hidden rounded-xl border border-white/10 transition hover:border-orange-400/60 ${
                              isFocusMode
                                ? "h-40 bg-neutral-950/40 shadow-[0_8px_25px_rgba(0,0,0,0.4)]"
                                : "h-24"
                            }`}
                          >
                            <img
                              src={src}
                              alt={`respuesta-${index}`}
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
                  </>
                ) : (
                  <p className="mt-2 text-sm text-neutral-400">
                    Aun no hay respuesta de TI en este ticket.
                  </p>
                )}
              </section>
            </div>
          </div>
        </header>
        {!isFocusMode && (
          <p className="mt-2 text-xs text-neutral-500">
            Haz clic para ver en primer plano.
          </p>
        )}

        {!canEditTicket && ticket.asignadoA && (
          <div className={`mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 ${isFocusMode ? "mx-auto max-w-4xl" : ""}`}>
            <p className="text-sm text-red-300">
              <span className="font-semibold">
                Ticket asignado a {ticket.asignadoA}
              </span>
            </p>
          </div>
        )}
        {!ticket.asignadoA && (
          <div className={`mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 ${isFocusMode ? "mx-auto max-w-4xl" : ""}`}>
            <p className="text-sm text-amber-300">
              <span className="font-semibold">Ticket sin asignar:</span> Este
              ticket no puede editarse hasta que sea asignado a un trabajador.
            </p>
          </div>
        )}

        <div
          className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            isFocusMode ? "mx-auto max-w-4xl" : ""
          }`}
        >
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
                  {option === "resuelto"
                    ? "resuelto (solicita confirmacion)"
                    : option}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isAuthorizedUser && (
          <div className={`mt-3 ${isFocusMode ? "mx-auto max-w-4xl" : ""}`}>
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
                    ? "Se requieren roles admin y jefe para asignar tickets"
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

        <div
          className={`mt-4 rounded-xl border border-white/10 bg-black/20 p-3 ${
            isFocusMode ? "mx-auto max-w-4xl" : ""
          }`}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-200">
            Editor de respuesta TI
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-400">Comentario de respuesta</span>
            <textarea
              rows={isFocusMode ? 5 : 3}
              value={responseComment}
              onChange={(event) =>
                setCommentDraft((draft) => ({
                  ...draft,
                  [ticket.ticketId]: event.target.value,
                }))
              }
              onPaste={(event) => {
                if (!canEditTicket) return;
                const clipboardItems = Array.from(event.clipboardData?.items ?? []);
                const clipboardImageFiles = clipboardItems
                  .filter(
                    (item) => item.kind === "file" && item.type.startsWith("image/")
                  )
                  .map((item) => item.getAsFile())
                  .filter((file): file is File => Boolean(file));
                const imageFiles =
                  clipboardImageFiles.length > 0
                    ? clipboardImageFiles
                    : Array.from(event.clipboardData?.files ?? []).filter((file) =>
                        file.type.startsWith("image/")
                      );
                if (!imageFiles.length) return;
                event.preventDefault();
                void onResponseImageFilesSelected(ticket, imageFiles);
              }}
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

          <div className="mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-400">Imagenes de respuesta</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={!canEditTicket || compressingResponseImages[ticket.ticketId]}
                onChange={(event) => {
                  void onResponseImagesSelected(ticket, event.target.files);
                  event.currentTarget.value = "";
                }}
                className="block w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                title={
                  !canEditTicket
                    ? ticket.asignadoA
                      ? "Solo el usuario asignado puede agregar imagenes"
                      : "El ticket debe estar asignado para agregar imagenes"
                    : ""
                }
              />
            </label>
            <p className="mt-1 text-xs text-neutral-400">
              Maximo {MAX_RESPONSE_IMAGES} imagenes en la respuesta TI. Tambien
              puedes pegarlas con Ctrl+V.
            </p>
            {compressingResponseImages[ticket.ticketId] && (
              <p className="mt-2 text-xs text-orange-300">
                Procesando imagenes de respuesta...
              </p>
            )}
            {responseImages.length > 0 && (
              <div
                className={`mt-3 gap-3 ${
                  isFocusMode
                    ? "grid [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]"
                    : "grid grid-cols-2 sm:grid-cols-3"
                }`}
              >
                {responseImages.map((src, index) => (
                  <div
                    key={index}
                    className="group relative h-24 overflow-hidden rounded-xl border border-white/10"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setImageModal({
                          src,
                          index,
                          total: responseImages.length,
                        })
                      }
                      className="h-full w-full"
                    >
                      <img
                        src={src}
                        alt={`respuesta-draft-${index}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </button>
                    {canEditTicket && (
                      <button
                        type="button"
                        onClick={() => onRemoveResponseImage(ticket, index)}
                        className="absolute right-1 top-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white transition hover:bg-red-500"
                        title="Quitar imagen de respuesta"
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSaveComment(ticket)}
              disabled={
                saving[ticket.ticketId] ||
                !canEditTicket ||
                compressingResponseImages[ticket.ticketId]
              }
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold transition hover:bg-orange-500 disabled:opacity-60"
              title={
                !canEditTicket
                  ? ticket.asignadoA
                    ? "Solo el usuario asignado puede guardar la respuesta"
                    : "El ticket debe estar asignado para guardar la respuesta"
                  : ""
              }
            >
              {saving[ticket.ticketId] ? "Guardando..." : "Guardar respuesta TI"}
            </button>
            {ticket.resolucionTime && (
              <span className="text-xs text-neutral-400">
                Resuelto: {new Date(ticket.resolucionTime).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        </div>
      </article>
    );
  };

  const hasLoadedVisibleData =
    unassignedPageItems.length > 0 ||
    myAssignedPageItems.length > 0 ||
    allPageItems.length > 0 ||
    unassignedTotalCount > 0 ||
    myAssignedTotalCount > 0 ||
    allTotalCount > 0 ||
    Boolean(metrics);

  if (loading && !hasLoadedVisibleData) {
    return (
      <div className="min-h-screen bg-white text-neutral-900 relative overflow-hidden px-4 py-10">
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
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
    <div className="min-h-screen bg-white text-neutral-900 relative overflow-hidden px-4 py-10">
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

        <datalist id={CREATOR_DATALIST_ID}>
          {creatorFilterOptions.map((option) => (
            <option
              key={option.userId}
              value={option.userId}
              label={option.displayName}
            />
          ))}
        </datalist>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
          {isAuthorizedUser && (
            <button
              type="button"
              onClick={() => setActiveTab("todos")}
              className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                activeTab === "todos"
                  ? "bg-orange-600 text-white"
                  : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              Todos{" "}
              {allPendingCountServer > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-sky-400 px-2 py-0.5 text-xs font-bold text-neutral-900">
                  {allPendingCountServer}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
              activeTab === "tickets"
                ? "bg-orange-600 text-white"
                : "text-neutral-300 hover:bg-white/10"
            }`}
          >
            Sin Asignar{" "}
            {unassignedPendingCountServer > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-sky-400 px-2 py-0.5 text-xs font-bold text-neutral-900">
                {unassignedPendingCountServer}
              </span>
            )}
          </button>
          {isAuthorizedUser && (
            <button
              type="button"
              onClick={() => setActiveTab("misAsignados")}
              className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                activeTab === "misAsignados"
                  ? "bg-orange-600 text-white"
                  : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              Mis Tickets{" "}
              {myAssignedPendingCountServer > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-sky-400 px-2 py-0.5 text-xs font-bold text-neutral-900">
                  {myAssignedPendingCountServer}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("metricas")}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
              activeTab === "metricas"
                ? "bg-orange-600 text-white"
                : "text-neutral-300 hover:bg-white/10"
            }`}
          >
            Métricas
          </button>
        </div>

        {(activeTab === "tickets" ||
          activeTab === "misAsignados" ||
          activeTab === "todos") && <div ref={ticketsStartRef} className="h-0" />}

        {activeTab === "tickets" && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="w-full text-sm text-neutral-300 sm:w-auto">
                  Riesgo
                  <select
                    value={riskFilter}
                    onChange={(event) =>
                      setRiskFilter(event.target.value as RiskFilter)
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 sm:ml-2 sm:mt-0 sm:w-auto"
                  >
                    {RISK_FILTER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-full text-sm text-neutral-300 sm:w-auto">
                  Ordenar
                  <select
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as SortOption)
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 sm:ml-2 sm:mt-0 sm:w-auto"
                  >
                    {(Object.keys(SORT_LABEL) as SortOption[]).map((option) => (
                      <option key={option} value={option}>
                        {SORT_LABEL[option]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-full text-sm text-neutral-300 sm:w-auto">
                  Usuario creador
                  <input
                    list={CREATOR_DATALIST_ID}
                    value={creatorFilter}
                    onChange={(event) => setCreatorFilter(event.target.value)}
                    placeholder="usuario o nombre exacto"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 sm:ml-2 sm:mt-0 sm:w-auto"
                  />
                </label>
                {creatorFilter.trim() && (
                  <button
                    type="button"
                    onClick={() => setCreatorFilter("")}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-200 transition hover:bg-white/10"
                  >
                    Limpiar usuario
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setUnassignedView("pendientes")}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                  unassignedView === "pendientes"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Pendientes ({unassignedPendingCountServer})
              </button>
              <button
                type="button"
                onClick={() => setUnassignedView("resueltos")}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                  unassignedView === "resueltos"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Resueltos ({unassignedResolvedCountServer})
              </button>
            </div>

            {unassignedView === "pendientes" ? (
              unassignedTotalCount === 0 && !unassignedListLoading ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                  No hay tickets pendientes.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {unassignedPageItems.map((ticket) =>
                      renderTicketCard(ticket)
                    )}
                  </div>
                  <Pagination
                    currentPage={unassignedPage}
                    totalPages={unassignedTotalPages}
                    onPageChange={handleUnassignedPageChange}
                    hasNextPage={unassignedPage < unassignedTotalPages}
                    hasPrevPage={unassignedPage > 1}
                  />
                </>
              )
            ) : unassignedTotalCount === 0 && !unassignedListLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                No hay tickets resueltos con los filtros seleccionados.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {unassignedPageItems.map((ticket) =>
                    renderTicketCard(ticket)
                  )}
                </div>
                <Pagination
                  currentPage={unassignedPage}
                  totalPages={unassignedTotalPages}
                  onPageChange={handleUnassignedPageChange}
                  hasNextPage={unassignedPage < unassignedTotalPages}
                  hasPrevPage={unassignedPage > 1}
                />
              </>
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
                    {myAssignedTotalCountServer}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Total asignados
                  </div>
                  {myAssignedPendingCountServer > 0 && (
                    <div className="mt-1 text-sm font-semibold text-red-400">
                      {myAssignedPendingCountServer} pendiente
                      {myAssignedPendingCountServer !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="w-full text-sm text-neutral-300 sm:w-auto">
                Usuario creador
                <input
                  list={CREATOR_DATALIST_ID}
                  value={creatorFilter}
                  onChange={(event) => setCreatorFilter(event.target.value)}
                  placeholder="usuario o nombre exacto"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 sm:ml-2 sm:mt-0 sm:w-auto"
                />
              </label>
              {creatorFilter.trim() && (
                <button
                  type="button"
                  onClick={() => setCreatorFilter("")}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-200 transition hover:bg-white/10"
                >
                  Limpiar usuario
                </button>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMyAssignedView("pendientes")}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                  myAssignedView === "pendientes"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Pendientes ({myAssignedPendingCountServer})
              </button>
              <button
                type="button"
                onClick={() => setMyAssignedView("resueltos")}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                  myAssignedView === "resueltos"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Resueltos ({myAssignedResolvedCountServer})
              </button>
            </div>

            {myAssignedView === "pendientes" ? (
              myAssignedTotalCount === 0 && !myAssignedListLoading ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300 text-center">
                  No tienes tickets pendientes asignados.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {myAssignedPageItems.map((ticket) =>
                      renderTicketCard(ticket)
                    )}
                  </div>
                  <Pagination
                    currentPage={myAssignedPage}
                    totalPages={myAssignedTotalPages}
                    onPageChange={handleMyAssignedPageChange}
                    hasNextPage={myAssignedPage < myAssignedTotalPages}
                    hasPrevPage={myAssignedPage > 1}
                  />
                </>
              )
            ) : myAssignedTotalCount === 0 && !myAssignedListLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300 text-center">
                No tienes tickets resueltos asignados.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {myAssignedPageItems.map((ticket) =>
                    renderTicketCard(ticket)
                  )}
                </div>
                <Pagination
                  currentPage={myAssignedPage}
                  totalPages={myAssignedTotalPages}
                  onPageChange={handleMyAssignedPageChange}
                  hasNextPage={myAssignedPage < myAssignedTotalPages}
                  hasPrevPage={myAssignedPage > 1}
                />
              </>
            )}
          </>
        )}
        {activeTab === "todos" && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="w-full text-sm text-neutral-300 sm:w-auto">
                  Riesgo
                  <select
                    value={riskFilter}
                    onChange={(event) =>
                      setRiskFilter(event.target.value as RiskFilter)
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 sm:ml-2 sm:mt-0 sm:w-auto"
                  >
                    {RISK_FILTER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-full text-sm text-neutral-300 sm:w-auto">
                  Ordenar
                  <select
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(event.target.value as SortOption)
                    }
                    className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 sm:ml-2 sm:mt-0 sm:w-auto"
                  >
                    {Object.entries(SORT_LABEL).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-full text-sm text-neutral-300 sm:w-auto">
                  Usuario creador
                  <input
                    list={CREATOR_DATALIST_ID}
                    value={creatorFilter}
                    onChange={(event) => setCreatorFilter(event.target.value)}
                    placeholder="usuario o nombre exacto"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-orange-500 sm:ml-2 sm:mt-0 sm:w-auto"
                  />
                </label>
                {creatorFilter.trim() && (
                  <button
                    type="button"
                    onClick={() => setCreatorFilter("")}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-200 transition hover:bg-white/10"
                  >
                    Limpiar usuario
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setAllView("pendientes")}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                  allView === "pendientes"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Pendientes ({allPendingCountServer})
              </button>
              <button
                type="button"
                onClick={() => setAllView("resueltos")}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                  allView === "resueltos"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Resueltos ({allResolvedCountServer})
              </button>
            </div>

            {allView === "pendientes" ? (
              allTotalCount === 0 && !allListLoading ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                  No hay tickets pendientes con los filtros seleccionados.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {allPageItems.map((ticket) => renderTicketCard(ticket))}
                  </div>
                  <Pagination
                    currentPage={allPage}
                    totalPages={allTotalPages}
                    onPageChange={handleAllPageChange}
                    hasNextPage={allPage < allTotalPages}
                    hasPrevPage={allPage > 1}
                  />
                </>
              )
            ) : allTotalCount === 0 && !allListLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                No hay tickets resueltos con los filtros seleccionados.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {allPageItems.map((ticket) => renderTicketCard(ticket))}
                </div>
                <Pagination
                  currentPage={allPage}
                  totalPages={allTotalPages}
                  onPageChange={handleAllPageChange}
                  hasNextPage={allPage < allTotalPages}
                  hasPrevPage={allPage > 1}
                />
              </>
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

      {/* Modal de ticket en primer plano */}
      {focusedTicket && (
        <div
          className="fixed inset-0 z-40 bg-black/80 p-3 md:p-5"
          onClick={() => setFocusedTicketId(null)}
        >
          <button
            type="button"
            onClick={() => setFocusedTicketId(null)}
            className="absolute right-6 top-5 z-10 rounded-xl border border-white/20 bg-black/50 px-4 py-2 text-sm text-white transition hover:bg-black/70"
          >
            Cerrar vista
          </button>
          <div
            className="h-full w-full overflow-y-auto rounded-2xl border border-white/20 bg-black/30 shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-2 py-3 md:px-4 md:py-5">
              {renderTicketCard(focusedTicket, "focus")}
            </div>
          </div>
        </div>
      )}

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

