import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useAuth } from "../auth/AuthContext";
import { isContaAdmin } from "../auth/isContaAdmin";
import { useCentroUsuarios } from "../features/gestion-activos/hooks/useCentroUsuarios";
import { listTickets, type Ticket } from "../services/tickets";

export default function AdminConta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usuarios, loading: usersLoading, error: usersError } =
    useCentroUsuarios();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const isAuthorized = isContaAdmin(user || undefined);

  const workerIds = useMemo(() => {
    return (usuarios || [])
      .filter((u) => Array.isArray(u.rol) && u.rol.includes("usrconta"))
      .map((u) => (u.usuario || "").trim().toLowerCase())
      .filter(Boolean);
  }, [usuarios]);

  const workerSet = useMemo(() => new Set(workerIds), [workerIds]);

  useEffect(() => {
    if (!isAuthorized) {
      navigate("/menu", { replace: true });
    }
  }, [isAuthorized, navigate]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (usersLoading) return;
    if (workerIds.length === 0) {
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
          const resp = await listTickets({ limit, skip });
          if (!resp.ok) {
            throw new Error(resp.error || "Error al cargar tickets");
          }

          total = resp.count ?? 0;
          all = all.concat(resp.data || []);

          if (resp.data.length < limit || all.length >= total) {
            break;
          }
          skip += limit;
        }

        const filtered = all.filter((ticket) => {
          const userId = (ticket.userId || "").trim().toLowerCase();
          return workerSet.has(userId);
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
  }, [isAuthorized, usersLoading, workerIds, workerSet]);

  useEffect(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    const next = tickets.filter((ticket) => {
      const userId = (ticket.userId || "").toLowerCase();
      const userName = (ticket.userName || "").toLowerCase();
      const userFull = (ticket.userFullName || "").toLowerCase();
      if (
        normalizedSearch &&
        !userId.includes(normalizedSearch) &&
        !userName.includes(normalizedSearch) &&
        !userFull.includes(normalizedSearch)
      ) {
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
  }, [tickets, search, fromDate, toDate]);

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

      <div className="relative mx-auto w-full max-w-5xl">
        <AppHeader
          title="Panel Contabilidad"
          subtitle="Tickets generados por usuarios con rol usrconta"
          backTo="/menu"
        />

        {usersError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {usersError}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
            <div className="text-sm font-semibold text-neutral-700">
              Tickets ({filteredTickets.length})
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario"
                className="h-9 w-48 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-9 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-9 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-sm text-neutral-500 text-center">
              Cargando tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="px-4 py-8 text-sm text-neutral-500 text-center">
              No hay tickets para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-neutral-900">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600">
                      Identificador
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600">
                      Categoría
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.ticketId}
                      className="border-t border-neutral-200 odd:bg-neutral-50/60"
                    >
                      <td className="px-4 py-3 text-sm text-neutral-800">
                        {ticket.ticketId}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800">
                        {ticket.userFullName ||
                          ticket.userName ||
                          ticket.userId ||
                          "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800">
                        {ticket.title}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
