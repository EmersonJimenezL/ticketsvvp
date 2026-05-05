import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AppHeader from "../components/AppHeader";
import { puedeRevisarAprobaciones } from "../utils/ticketApproval";

export default function AdminHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const showApprovalPanel = puedeRevisarAprobaciones(user || undefined);

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
            className="group relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 p-8 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-orange-200 hover:bg-white sm:w-[22rem]"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-100 blur-2xl transition group-hover:bg-orange-200" />
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-orange-200 bg-orange-100 text-xl text-orange-700">
                TK
              </div>
              <div>
                <div className="text-xl font-bold">Gestionar Tickets</div>
                <div className="text-sm text-neutral-600">
                  Ver y actualizar pendientes
                </div>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-orange-700">
              <span>Ir al módulo</span>
              <span className="transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>

          {/* Card Activos */}
          <button
            type="button"
            onClick={() => navigate("/admin/gestion-activos")}
            className="group relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 p-8 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-orange-200 hover:bg-white sm:w-[22rem]"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-100 blur-2xl transition group-hover:bg-orange-200" />
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-orange-200 bg-orange-100 text-xl text-orange-700">
                AC
              </div>
              <div>
                <div className="text-xl font-bold">Gestionar Activos</div>
                <div className="text-sm text-neutral-600">
                  Activos y licencias
                </div>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-orange-700">
              <span>Ir al módulo</span>
              <span className="transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>

          {/* Card Modelos */}
          <button
            type="button"
            onClick={() => navigate("/admin/modelos")}
            className="group relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 p-8 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-orange-200 hover:bg-white sm:w-[22rem]"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-100 blur-2xl transition group-hover:bg-orange-200" />
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-orange-200 bg-orange-100 text-xl text-orange-700">
                MO
              </div>
              <div>
                <div className="text-xl font-bold">Gestionar Modelos</div>
                <div className="text-sm text-neutral-600">
                  Especificaciones técnicas
                </div>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-orange-700">
              <span>Ir al módulo</span>
              <span className="transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/usuarios")}
            className="group relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 p-8 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-orange-200 hover:bg-white sm:w-[22rem]"
          >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-100 blur-2xl transition group-hover:bg-orange-200" />
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-orange-200 bg-orange-100 text-xl font-semibold text-orange-700">
                U
              </div>
              <div>
                <div className="text-xl font-bold">Gestionar Usuarios</div>
                <div className="text-sm text-neutral-600">
                  Centro de Aplicaciones
                </div>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-orange-700">
              <span>Ir al módulo</span>
              <span className="transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>

          {showApprovalPanel && (
            <button
              type="button"
              onClick={() => navigate("/tickets/equipo")}
              className="group relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 p-8 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-orange-200 hover:bg-white sm:w-[22rem]"
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-100 blur-2xl transition group-hover:bg-orange-200" />
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-orange-200 bg-orange-100 text-xl font-semibold text-orange-700">
                  EQ
                </div>
                <div>
                  <div className="text-xl font-bold">Tickets de mi equipo</div>
                  <div className="text-sm text-neutral-600">
                    Seguimiento de trabajadores por área
                  </div>
                </div>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm text-orange-700">
                <span>Ir al modulo</span>
                <span className="transition group-hover:translate-x-0.5">→</span>
              </div>
            </button>
          )}

          {showApprovalPanel && (
            <button
              type="button"
              onClick={() => navigate("/tickets/aprobaciones")}
              className="group relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 p-8 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-fuchsia-200 hover:bg-white sm:w-[22rem]"
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-fuchsia-100 blur-2xl transition group-hover:bg-fuchsia-200" />
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-fuchsia-200 bg-fuchsia-100 text-xl font-semibold text-fuchsia-700">
                  AP
                </div>
                <div>
                  <div className="text-xl font-bold">Solicitudes por Aprobar</div>
                  <div className="text-sm text-neutral-600">
                    Revision previa de jefatura
                  </div>
                </div>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm text-fuchsia-700">
                <span>Ir al modulo</span>
                <span className="transition group-hover:translate-x-0.5">→</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

