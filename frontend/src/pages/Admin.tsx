import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listTickets, patchTicket, type Ticket } from "../services/tickets";
import { useAuth } from "../auth/AuthContext";

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

export default function Admin() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    (async () => {
      setError(null);
      const r = await listTickets({ limit: 500 });
      if (r.ok && Array.isArray(r.data)) {
        setItems(r.data);
      } else {
        setError(r.error || "No se pudieron cargar los tickets.");
      }
      setLoading(false);
    })();
  }, []);

  // pendientes ordenados: riesgo desc, luego ticketTime asc
  const pendingSorted = useMemo(() => {
    return items
      .filter((t) => t.state !== "resuelto")
      .sort(
        (a, b) =>
          RISK_ORDER[b.risk] - RISK_ORDER[a.risk] ||
          new Date(a.ticketTime || 0).getTime() -
            new Date(b.ticketTime || 0).getTime()
      );
  }, [items]);

  async function onPatch(
    t: Ticket,
    patch: Partial<Pick<Ticket, "risk" | "state">>
  ) {
    setSaving((s) => ({ ...s, [t.ticketId]: true }));
    setError(null);
    const prev = { ...t };
    try {
      // optimista
      setItems((list) =>
        list.map((x) => (x.ticketId === t.ticketId ? { ...x, ...patch } : x))
      );
      const r = await patchTicket(t.ticketId, patch);
      if (!r.ok) throw new Error(r.error || "No se pudo actualizar el ticket.");
      if (patch.state === "resuelto") {
        setItems((list) => list.filter((x) => x.ticketId !== t.ticketId));
      }
    } catch (e: any) {
      setItems((list) =>
        list.map((x) => (x.ticketId === prev.ticketId ? prev : x))
      );
      setError(e?.message || "Error actualizando el ticket.");
    } finally {
      setSaving((s) => ({ ...s, [t.ticketId]: false }));
    }
  }

  async function onSaveComment(t: Ticket) {
    const draft = commentDraft[t.ticketId] ?? t.comment ?? "";
    setSaving((s) => ({ ...s, [t.ticketId]: true }));
    setError(null);
    const prev = t.comment ?? "";
    try {
      // optimista
      setItems((list) =>
        list.map((x) =>
          x.ticketId === t.ticketId ? { ...x, comment: draft } : x
        )
      );
      const r = await patchTicket(t.ticketId, { comment: draft });
      if (!r.ok)
        throw new Error(r.error || "No se pudo guardar el comentario.");
    } catch (e: any) {
      // revertir
      setItems((list) =>
        list.map((x) =>
          x.ticketId === t.ticketId ? { ...x, comment: prev } : x
        )
      );
      setError(e?.message || "Error guardando comentario.");
    } finally {
      setSaving((s) => ({ ...s, [t.ticketId]: false }));
    }
  }

  if (loading) {
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

        <div className="relative w-full max-w-6xl mx-auto">
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Panel de Administración
              </h2>
              <p className="text-neutral-300 text-sm">Cargando tickets…</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Cerrar sesión
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse h-36"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden px-4 py-10">
      {/* Fondos decorativos */}
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

      <div className="relative w-full max-w-6xl mx-auto">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Panel de Administración
          </h2>
          <div className="flex items-center gap-3">
            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate("/admin/gestion-activos")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Gestión de Activos
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pendingSorted.map((t) => (
            <article
              key={t.ticketId}
              className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ${
                RISK_RING[t.risk]
              } transition hover:bg-white/10`}
            >
              <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold truncate">
                      {t.title}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        RISK_BADGE[t.risk]
                      }`}
                    >
                      {t.risk}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-300 line-clamp-3">
                    {t.description}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {t.userName} ·{" "}
                    {t.ticketTime
                      ? new Date(t.ticketTime).toLocaleString()
                      : "sin fecha"}
                  </p>
                </div>
              </header>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400">Riesgo</span>
                  <select
                    aria-label="Cambiar riesgo"
                    disabled={saving[t.ticketId]}
                    value={t.risk}
                    onChange={(e) =>
                      onPatch(t, { risk: e.target.value as Ticket["risk"] })
                    }
                    className="block w-full rounded-xl bg-neutral-900/70 border border-white/10 text-neutral-100 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                  >
                    {riskOpts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400">Estado</span>
                  <select
                    aria-label="Cambiar estado"
                    disabled={saving[t.ticketId]}
                    value={t.state}
                    onChange={(e) =>
                      onPatch(t, { state: e.target.value as Ticket["state"] })
                    }
                    className="block w-full rounded-xl bg-neutral-900/70 border border-white/10 text-neutral-100 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                  >
                    {stateOpts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Comentario */}
              <div className="mt-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400">Comentario</span>
                  <textarea
                    rows={3}
                    value={commentDraft[t.ticketId] ?? t.comment ?? ""}
                    onChange={(e) =>
                      setCommentDraft((m) => ({
                        ...m,
                        [t.ticketId]: e.target.value,
                      }))
                    }
                    placeholder="Describe acciones realizadas, hallazgos o notas."
                    className="w-full rounded-xl bg-neutral-900/70 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSaveComment(t)}
                    disabled={saving[t.ticketId]}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold hover:bg-orange-500 transition disabled:opacity-60"
                  >
                    {saving[t.ticketId] ? "Guardando..." : "Guardar comentario"}
                  </button>
                  {t.resolucionTime && (
                    <span className="text-xs text-neutral-400">
                      Resuelto: {new Date(t.resolucionTime).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {pendingSorted.length === 0 && (
          <div className="mt-10 text-center text-neutral-400">
            No hay tickets pendientes.
          </div>
        )}
      </div>
    </div>
  );
}
