import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";

export default function AdminHome() {
  const navigate = useNavigate();

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

      <div className="relative mx-auto max-w-5xl">
        <AppHeader
          title="Centro de Administración"
          subtitle="Elige un módulo para continuar"
          backTo="/menu"
        />

        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {/* Card Tickets */}
          <button
            type="button"
            onClick={() => navigate("/admin/tickets")}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.04] p-8 text-left backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition hover:border-white/20 hover:from-white/15 hover:to-white/[0.08] w-full sm:w-[22rem]"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl group-hover:bg-orange-500/20 transition" />
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-600/20 border border-orange-600/30 text-orange-300 text-xl">
                🎫
              </div>
              <div>
                <div className="text-xl font-bold">Gestionar Tickets</div>
                <div className="text-neutral-300 text-sm">
                  Ver y actualizar pendientes
                </div>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-orange-300">
              <span>Ir al módulo</span>
              <span className="transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>

          {/* Card Activos */}
          <button
            type="button"
            onClick={() => navigate("/admin/gestion-activos")}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.04] p-8 text-left backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition hover:border-white/20 hover:from-white/15 hover:to-white/[0.08] w-full sm:w-[22rem]"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl group-hover:bg-orange-500/20 transition" />
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-600/20 border border-orange-600/30 text-orange-300 text-xl">
                🧰
              </div>
              <div>
                <div className="text-xl font-bold">Gestionar Activos</div>
                <div className="text-neutral-300 text-sm">
                  Activos y licencias
                </div>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-orange-300">
              <span>Ir al módulo</span>
              <span className="transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>

          {/* Card Modelos */}
          <button
            type="button"
            onClick={() => navigate("/admin/modelos")}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.04] p-8 text-left backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition hover:border-white/20 hover:from-white/15 hover:to-white/[0.08] w-full sm:w-[22rem]"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl group-hover:bg-orange-500/20 transition" />
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-600/20 border border-orange-600/30 text-orange-300 text-xl">
                🧩
              </div>
              <div>
                <div className="text-xl font-bold">Gestionar Modelos</div>
                <div className="text-neutral-300 text-sm">
                  Especificaciones técnicas
                </div>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-orange-300">
              <span>Ir al módulo</span>
              <span className="transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
