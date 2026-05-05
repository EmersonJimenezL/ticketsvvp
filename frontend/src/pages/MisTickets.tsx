// src/pages/MisTickets.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  listTicketsPaginated,
  rateTicket,
  respondTicketClosure,
  type Ticket,
} from "../services/tickets";
import AppHeader from "../components/AppHeader";
import TicketRatingCard from "../components/TicketRatingCard";
import { Pagination } from "../features/gestion-activos/components/Pagination";
import {
  formatTicketClosureRemaining,
  getTicketClosureRemainingMs,
  isTicketClosureFinal,
  isTicketClosurePending,
} from "../utils/ticketClosure";
import {
  obtenerClasesEstadoAprobacion,
  obtenerEtiquetaEstadoAprobacion,
  ticketPendienteAprobacion,
  ticketRechazadoPorAprobacion,
} from "../utils/ticketApproval";

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

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: "dateAsc", label: "Fecha (antiguo -> reciente)" },
  { value: "dateDesc", label: "Fecha (reciente -> antiguo)" },
  { value: "riskDesc", label: "Riesgo (alto -> bajo)" },
  { value: "stateAsc", label: "Estado (recibido -> resuelto)" },
  { value: "titleAsc", label: "Categoria (A -> Z)" },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]["value"];

function mapSortOptionToBackend(sortBy: SortOption) {
  switch (sortBy) {
    case "dateAsc":
      return "createdAsc";
    case "dateDesc":
      return "createdDesc";
    case "riskDesc":
      return "risk";
    case "stateAsc":
      return "stateAsc";
    case "titleAsc":
      return "titleAsc";
    default:
      return "createdAsc";
  }
}

function formatFechaHoraCierre(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

export default function MisTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = useMemo(
    () => (user?.nombreUsuario || user?.usuario || "").trim(),
    [user?.nombreUsuario, user?.usuario]
  );

  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [estado, setEstado] = useState<"" | Ticket["state"]>("");
  const [titulo, setTitulo] = useState<"" | Ticket["title"]>("");
  const [sortBy, setSortBy] = useState<SortOption>("dateAsc");
  const [statusTab, setStatusTab] = useState<"pendientes" | "resueltos">(
    "pendientes"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [focusedTicketId, setFocusedTicketId] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<{ src: string; index: number; total: number } | null>(null);
  const [closureCommentDraft, setClosureCommentDraft] = useState<Record<string, string>>({});
  const [closureSubmitting, setClosureSubmitting] = useState<Record<string, boolean>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const ticketsStartRef = useRef<HTMLDivElement | null>(null);

  const scrollToTicketsStart = useCallback(() => {
    const target = ticketsStartRef.current;
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      requestAnimationFrame(scrollToTicketsStart);
    },
    [scrollToTicketsStart]
  );

  const handleRateTicket = useCallback(
    async (ticketId: string, score: number, comment: string) => {
      if (!currentUserId) {
        throw new Error("Sesion no valida.");
      }

      const normalizedComment = comment.trim();
      const payload = {
        ratingScore: score,
        ratingComment: normalizedComment || undefined,
        userId: currentUserId,
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
    [currentUserId]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount]
  );

  const refreshCounts = useCallback(async () => {
    if (!currentUserId) {
      setPendingCount(0);
      setResolvedCount(0);
      return;
    }

    const baseParams = {
      userId: currentUserId,
      title: titulo || undefined,
      limit: 1,
      skip: 0,
    };

    try {
      if (estado === "resuelto") {
        const resolvedResp = await listTicketsPaginated({
          ...baseParams,
          state: "resuelto",
        });
        if (!resolvedResp.ok) {
          throw new Error(resolvedResp.error || "No se pudieron obtener conteos");
        }
        setPendingCount(0);
        setResolvedCount(resolvedResp.count ?? 0);
        return;
      }

      if (estado) {
        const pendingResp = await listTicketsPaginated({
          ...baseParams,
          state: estado,
        });
        if (!pendingResp.ok) {
          throw new Error(pendingResp.error || "No se pudieron obtener conteos");
        }
        setPendingCount(pendingResp.count ?? 0);
        setResolvedCount(0);
        return;
      }

      const [pendingResp, resolvedResp] = await Promise.all([
        listTicketsPaginated({
          ...baseParams,
          excludeState: "resuelto",
        }),
        listTicketsPaginated({
          ...baseParams,
          state: "resuelto",
        }),
      ]);

      if (!pendingResp.ok || !resolvedResp.ok) {
        throw new Error(
          pendingResp.error || resolvedResp.error || "No se pudieron obtener conteos"
        );
      }

      setPendingCount(pendingResp.count ?? 0);
      setResolvedCount(resolvedResp.count ?? 0);
    } catch (e: any) {
      setError(e?.message || "No se pudieron obtener conteos.");
    }
  }, [currentUserId, titulo, estado]);

  const cargar = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;

      if (!currentUserId) {
        setError("Sesion no valida.");
        setItems([]);
        setTotalCount(0);
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }
        const params: Parameters<typeof listTicketsPaginated>[0] = {
          userId: currentUserId,
          title: titulo || undefined,
          sortBy: mapSortOptionToBackend(sortBy),
          limit: PAGE_SIZE,
          skip: (currentPage - 1) * PAGE_SIZE,
        };

        if (statusTab === "pendientes") {
          if (estado) {
            params.state = estado;
          } else {
            params.excludeState = "resuelto";
          }
        } else {
          params.state = "resuelto";
        }

        const resp = await listTicketsPaginated(params);
        if (!resp.ok) throw new Error(resp.error || "Error listando tickets");
        setItems(Array.isArray(resp.data) ? resp.data : []);
        setTotalCount(resp.count ?? 0);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "No se pudo obtener tus tickets");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [
      currentUserId,
      titulo,
      sortBy,
      currentPage,
      statusTab,
      estado,
    ]
  );

  const handleClosureDecision = useCallback(
    async (ticket: Ticket, decision: "accept" | "reject") => {
      const comment = (closureCommentDraft[ticket.ticketId] || "").trim();
      if (decision === "reject" && !comment) {
        throw new Error("Debes indicar por que el ticket sigue abierto.");
      }

      setClosureSubmitting((current) => ({
        ...current,
        [ticket.ticketId]: true,
      }));
      setError(null);

      try {
        const response = await respondTicketClosure(ticket.ticketId, {
          decision,
          comment: decision === "reject" ? comment : undefined,
        });
        if (!response.ok) {
          throw new Error(
            response.error || "No se pudo registrar la decision del cierre."
          );
        }

        if (response.data) {
          setItems((current) =>
            current.map((item) =>
              item.ticketId === ticket.ticketId
                ? { ...item, ...(response.data as Ticket) }
                : item
            )
          );
        }

        setClosureCommentDraft((current) => {
          if (!(ticket.ticketId in current)) return current;
          const next = { ...current };
          delete next[ticket.ticketId];
          return next;
        });

        await Promise.all([cargar({ silent: true }), refreshCounts()]);
      } finally {
        setClosureSubmitting((current) => ({
          ...current,
          [ticket.ticketId]: false,
        }));
      }
    },
    [closureCommentDraft, cargar, refreshCounts]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, titulo, estado, sortBy]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Auto-refresh cada 30 segundos para mantener datos actualizados
  useEffect(() => {
    const interval = setInterval(() => {
      void cargar({ silent: true });
      void refreshCounts();
    }, 30000);

    return () => clearInterval(interval);
  }, [cargar, refreshCounts]);

  useEffect(() => {
    const onFocus = () => {
      void cargar({ silent: true });
      void refreshCounts();
    };
    const onVisible = () => {
      if (!document.hidden) {
        void cargar({ silent: true });
        void refreshCounts();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [cargar, refreshCounts]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const focusedTicket = useMemo(
    () =>
      focusedTicketId
        ? items.find((ticket) => ticket.ticketId === focusedTicketId) || null
        : null,
    [focusedTicketId, items]
  );

  const pendingClosureItems = useMemo(
    () => items.filter((ticket) => isTicketClosurePending(ticket)),
    [items]
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

  const renderTicketCard = (ticket: Ticket, mode: "grid" | "focus" = "grid") => {
    const isFocusMode = mode === "focus";
    const requestImages = Array.isArray(ticket.images) ? ticket.images : [];
    const responseImages = Array.isArray(ticket.imagesRespuesta)
      ? ticket.imagesRespuesta
      : [];
    const hasResponseContent =
      Boolean((ticket.comment || "").trim()) || responseImages.length > 0;
    const closurePending = isTicketClosurePending(ticket);
    const closureFinal = isTicketClosureFinal(ticket);
    const closureRemainingMs = getTicketClosureRemainingMs(ticket, nowMs);
    const closureWindowExpired =
      closureRemainingMs != null && closureRemainingMs <= 0;
    const closureDraftComment = closureCommentDraft[ticket.ticketId] || "";
    const closureActionBusy = Boolean(closureSubmitting[ticket.ticketId]);
    const fechaEntradaCierre = formatFechaHoraCierre(
      ticket.closureRequestedAt || ticket.resolucionTime
    );
    const approvalPending = ticketPendienteAprobacion(ticket);
    const approvalRejected = ticketRechazadoPorAprobacion(ticket);
    const approvalBadgeLabel = obtenerEtiquetaEstadoAprobacion(
      ticket.estadoAprobacion
    );
    const approvalBadgeClasses = obtenerClasesEstadoAprobacion(
      ticket.estadoAprobacion
    );

    return (
      <article
        key={ticket.ticketId}
        className={`rounded-2xl border border-white/10 bg-white/5 transition ${
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
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setFocusedTicketId(ticket.ticketId);
                }
              }
        }
        role={isFocusMode ? undefined : "button"}
        tabIndex={isFocusMode ? undefined : 0}
      >
      <div className={isFocusMode ? "mx-auto w-full max-w-5xl" : ""}>
      <div
        className={`flex flex-wrap items-start justify-between gap-3 ${
          isFocusMode ? "border-b border-white/10 pb-4" : ""
        }`}
      >
        <div>
          <div className="text-xs text-neutral-400">Ticket</div>
          <div
            className={`font-semibold text-neutral-100 ${
              isFocusMode ? "text-2xl" : "text-lg"
            }`}
          >
            {ticket.ticketId}
          </div>
        </div>
        <div className={`text-xs text-neutral-400 ${isFocusMode ? "text-sm" : ""}`}>
          {ticket.ticketTime ? new Date(ticket.ticketTime).toLocaleString() : ""}
        </div>
      </div>
      {!isFocusMode && (
        <p className="mt-2 text-xs text-neutral-500">
          Haz clic para ver en primer plano.
        </p>
      )}

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
        {approvalBadgeLabel && (
          <span
            className={`rounded-lg border px-2 py-1 text-xs ${approvalBadgeClasses}`}
          >
            {approvalBadgeLabel}
          </span>
        )}
        {closurePending && (
          <span className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs text-cyan-800">
            Pendiente de tu confirmacion
          </span>
        )}
        {ticket.closureStatus === "accepted" && (
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
            Cierre aceptado
          </span>
        )}
        {ticket.closureStatus === "expired" && (
          <span className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
            Cerrado automatico
          </span>
        )}
      </div>

      <div className="mt-3 text-neutral-700">
        {approvalPending && (
          <div
            className={`mt-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-3 ${
              isFocusMode ? "mx-auto max-w-4xl" : ""
            }`}
          >
            <p className="text-sm font-semibold text-fuchsia-900">
              Este ticket esta pendiente de aprobacion de jefatura
            </p>
            <p className="mt-1 text-sm text-fuchsia-800">
              Aun no ingresa a la cola de TI. La jefatura debe revisar y dar su
              visto bueno antes de que el requerimiento sea gestionado.
            </p>
          </div>
        )}
        {ticket.estadoAprobacion === "aprobado" && (
          <div
            className={`mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 ${
              isFocusMode ? "mx-auto max-w-4xl" : ""
            }`}
          >
            <p className="text-sm font-semibold text-emerald-900">
              La jefatura aprobo esta solicitud
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              El ticket ya puede ser gestionado por TI.
            </p>
          </div>
        )}
        {approvalRejected && (
          <div
            className={`mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 ${
              isFocusMode ? "mx-auto max-w-4xl" : ""
            }`}
          >
            <p className="text-sm font-semibold text-rose-900">
              La jefatura rechazo esta solicitud
            </p>
            <p className="mt-1 text-sm text-rose-800">
              {ticket.comentarioAprobacion?.trim()
                ? ticket.comentarioAprobacion
                : "No se registro un motivo de rechazo."}
            </p>
          </div>
        )}
        {closurePending && (
          <div
            className={`mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-3 ${
              isFocusMode ? "mx-auto max-w-4xl" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-cyan-900">
                El ticket entro en etapa de cierre
              </p>
              {fechaEntradaCierre && (
                <span className="rounded-full border border-cyan-200 bg-white/80 px-2 py-0.5 text-xs font-medium text-cyan-800">
                  {fechaEntradaCierre}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-cyan-800">
              Confirma si la solucion fue correcta. Si no respondes, el ticket
              se cerrara automaticamente.
            </p>
            <p className="mt-1 text-xs text-cyan-700">
              {closureWindowExpired
                ? "El plazo de confirmacion ya vencio."
                : closureRemainingMs != null
                  ? `Tiempo restante: ${formatTicketClosureRemaining(
                      closureRemainingMs
                    )}.`
                  : "Esperando confirmacion."}
            </p>

            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-cyan-700">
                  Si no se resolvio, indica que falta
                </span>
                <textarea
                  rows={isFocusMode ? 4 : 3}
                  value={closureDraftComment}
                  disabled={closureActionBusy || closureWindowExpired}
                  onChange={(event) =>
                    setClosureCommentDraft((current) => ({
                      ...current,
                      [ticket.ticketId]: event.target.value,
                    }))
                  }
                  placeholder="Explica por que el ticket debe seguir abierto."
                  className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={closureActionBusy || closureWindowExpired}
                  onClick={() => {
                    void handleClosureDecision(ticket, "accept").catch((err) => {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "No se pudo aceptar el cierre."
                      );
                    });
                  }}
                  className="rounded-xl bg-emerald-600/75 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500/80 disabled:opacity-60"
                >
                  {closureActionBusy ? "Guardando..." : "Aceptar cierre"}
                </button>
                <button
                  type="button"
                  disabled={closureActionBusy || closureWindowExpired}
                  onClick={() => {
                    void handleClosureDecision(ticket, "reject").catch((err) => {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "No se pudo rechazar el cierre."
                      );
                    });
                  }}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
                >
                  Sigue abierto
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Mostrar quien est  atendiendo el ticket */}
        <div
          className={`mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 ${
            isFocusMode ? "mx-auto max-w-4xl" : ""
          }`}
        >
          {ticket.asignadoA ? (
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Atendido por:</span> {ticket.asignadoA}
            </p>
          ) : (
            <p className="text-sm text-neutral-600">
              Tu ticket esta pendiente de asignacion
            </p>
          )}
        </div>
        <div
          className={`mt-4 grid grid-cols-1 gap-3 ${
            isFocusMode ? "mx-auto max-w-5xl lg:grid-cols-2" : ""
          }`}
        >
          <section className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">
              Solicitud del usuario
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">
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
                      setImageModal({ src, index, total: requestImages.length })
                    }
                    className={`group relative w-full overflow-hidden rounded-xl border border-white/10 transition hover:border-sky-400/60 ${
                      isFocusMode
                        ? "h-40 bg-neutral-950/40 shadow-[0_8px_25px_rgba(0,0,0,0.4)]"
                        : "h-28"
                    }`}
                  >
                    <img
                      src={src}
                      alt={`ticket-${index}`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                      <span className="text-xs font-semibold text-white">Ver imagen</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-sky-700">Sin imagenes adjuntas.</p>
            )}
          </section>

          <section className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-900">
              Respuesta TI
            </p>
            {hasResponseContent ? (
              <>
                {ticket.comment?.trim() ? (
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">
                    {ticket.comment}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-neutral-500">
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
                          setImageModal({ src, index, total: responseImages.length })
                        }
                        className={`group relative w-full overflow-hidden rounded-xl border border-white/10 transition hover:border-orange-400/60 ${
                          isFocusMode
                            ? "h-40 bg-neutral-950/40 shadow-[0_8px_25px_rgba(0,0,0,0.4)]"
                            : "h-28"
                        }`}
                      >
                        <img
                          src={src}
                          alt={`respuesta-${index}`}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                          <span className="text-xs font-semibold text-white">Ver imagen</span>
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
        {ticket.resolucionTime && (
          <p className="mt-1 text-xs text-neutral-400">
            Resuelto: {new Date(ticket.resolucionTime).toLocaleString()}
          </p>
        )}

        {closureFinal && (
          <TicketRatingCard
            ticketId={ticket.ticketId}
            ratingScore={ticket.ratingScore}
            ratingComment={ticket.ratingComment}
            onSubmit={(score, comment) => handleRateTicket(ticket.ticketId, score, comment)}
          />
        )}
      </div>
      </div>
      </article>
    );
  };

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
            className="w-full rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 sm:w-auto sm:min-w-[220px]"
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
            className="w-full rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 sm:w-auto sm:min-w-[220px]"
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
            className="w-full rounded-xl bg-neutral-900/70 px-4 py-3 ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 sm:w-auto sm:min-w-[240px]"
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
            <div ref={ticketsStartRef} className="h-0" />
            {statusTab === "resueltos" && pendingClosureItems.length > 0 && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                {pendingClosureItems.length === 1
                  ? `Tienes 1 ticket esperando confirmacion de cierre en esta pagina.`
                  : `Tienes ${pendingClosureItems.length} tickets esperando confirmacion de cierre en esta pagina.`}
              </div>
            )}
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setStatusTab("pendientes")}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                  statusTab === "pendientes"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("resueltos")}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto sm:flex-1 ${
                  statusTab === "resueltos"
                    ? "bg-orange-600 text-white"
                    : "text-neutral-300 hover:bg-white/10"
                }`}
              >
                Resueltos ({resolvedCount})
              </button>
            </div>

            {statusTab === "pendientes" ? (
              totalCount === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                  No tienes tickets pendientes para los filtros seleccionados.
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((ticket) => renderTicketCard(ticket))}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    hasNextPage={currentPage < totalPages}
                    hasPrevPage={currentPage > 1}
                  />
                </>
              )
            ) : totalCount === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                No se encontraron tickets resueltos con los filtros actuales.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((ticket) => renderTicketCard(ticket))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  hasNextPage={currentPage < totalPages}
                  hasPrevPage={currentPage > 1}
                />
              </>
            )}
          </div>
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

