import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listTickets, type Ticket } from "../services/tickets";

const PAGE_SIZE = 200;

type FetchState = "idle" | "loading" | "appending";

type TicketRow = Ticket & {
  ownerDisplay: string;
  createdLabel: string;
  resolvedLabel: string;
};

function buildOwnerDisplay(ticket: Ticket): string {
  const fullName = (ticket.userFullName ?? "").trim();
  if (fullName) return fullName;
  const firstName = (ticket.userName ?? "").trim();
  const lastName = (ticket.userLastName ?? "").trim();
  const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  if (ticket.userId?.trim()) return ticket.userId.trim();
  return "Sin usuario";
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function enhanceTicket(ticket: Ticket): TicketRow {
  return {
    ...ticket,
    ownerDisplay: buildOwnerDisplay(ticket),
    createdLabel: formatDateTime(ticket.ticketTime ?? ticket.createdAt),
    resolvedLabel: formatDateTime(ticket.resolucionTime ?? ticket.updatedAt),
  };
}

export default function AdminTicketsHistorico() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TicketRow[]>([]);
  const [status, setStatus] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadTickets = async (options: { append?: boolean } = {}) => {
    const { append = false } = options;
    try {
      setStatus(append ? "appending" : "loading");
      setError(null);
      const resp = await listTickets({ limit: PAGE_SIZE, skip: append ? skip : 0 });
      if (!resp.ok) {
        throw new Error(resp.error || "No se pudo obtener el historico");
      }
      const rows = (resp.data ?? []).map(enhanceTicket);
      if (append) {
        setItems((current) => [...current, ...rows]);
        setSkip((current) => current + rows.length);
      } else {
        setItems(rows);
        setSkip(rows.length);
      }
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el historico");
    } finally {
      setStatus("idle");
    }
  };

  useEffect(() => {
    void loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedByYear = useMemo(() => {
    const map = new Map<string, TicketRow[]>();
    items.forEach((ticket) => {
      const date = new Date(ticket.ticketTime ?? ticket.createdAt ?? 0);
      const year = Number.isNaN(date.getTime())
        ? "Sin fecha"
        : String(date.getFullYear());
      const list = map.get(year) ?? [];
      list.push(ticket);
      map.set(year, list);
    });
    return Array.from(map.entries())
      .map(([year, records]) => ({
        year,
        records: records.sort(
          (a, b) =>
            new Date(b.ticketTime ?? b.createdAt ?? 0).getTime() -
            new Date(a.ticketTime ?? a.createdAt ?? 0).getTime()
        ),
      }))
      .sort((a, b) => {
        if (a.year === "Sin fecha") return 1;
        if (b.year === "Sin fecha") return -1;
        return Number(b.year) - Number(a.year);
      });
  }, [items]);

  const isLoading = status === "loading" && !items.length;
  const isAppending = status === "appending";

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

      <div className="relative mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Historico de tickets</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Registros completos de tickets creados y su estado final.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => void loadTickets()}
              disabled={status !== "idle"}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition disabled:opacity-60"
            >
              {status !== "idle" ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </header>

        {isLoading && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-neutral-300">
            Cargando historico...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-6">
            {groupedByYear.map(({ year, records }) => (
              <section key={year} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <header className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-100">{year}</h2>
                  <span className="text-xs text-neutral-400">{records.length} tickets</span>
                </header>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-neutral-200">
                    <thead className="text-xs uppercase text-neutral-400">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2">Ticket</th>
                        <th className="whitespace-nowrap px-3 py-2">Categoria</th>
                        <th className="whitespace-nowrap px-3 py-2">Solicitante</th>
                        <th className="whitespace-nowrap px-3 py-2">Riesgo</th>
                        <th className="whitespace-nowrap px-3 py-2">Estado</th>
                        <th className="whitespace-nowrap px-3 py-2">Creado</th>
                        <th className="whitespace-nowrap px-3 py-2">Resuelto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {records.map((ticket) => (
                        <tr key={ticket.ticketId} className="hover:bg-white/5 transition">
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-100">
                            {ticket.ticketId}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{ticket.title}</td>
                          <td className="whitespace-nowrap px-3 py-2">{ticket.ownerDisplay}</td>
                          <td className="whitespace-nowrap px-3 py-2 capitalize">
                            {ticket.risk}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 capitalize">
                            {ticket.state}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                            {ticket.createdLabel}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                            {ticket.resolvedLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            {items.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-neutral-300">
                No se encontraron tickets registrados.
              </div>
            )}
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void loadTickets({ append: true })}
              disabled={isAppending}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-100 transition hover:bg-white/10 disabled:opacity-60"
            >
              {isAppending ? "Cargando..." : "Cargar mas"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

