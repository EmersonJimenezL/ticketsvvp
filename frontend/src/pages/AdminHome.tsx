import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AdminHome() {
  const navigate = useNavigate();
  const { logout } = useAuth();

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

      <div className="relative mx-auto max-w-4xl">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Centro de Administración
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
              type="button"
            >
              Volver
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10 transition"
              type="button"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            type="button"
            onClick={() => navigate("/admin/tickets")}
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-10 text-center backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            <div className="text-2xl font-bold">Gestionar Tickets</div>
            <div className="text-neutral-300 mt-1">
              Ver y actualizar pendientes
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/gestion-activos")}
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-10 text-center backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          >
            <div className="text-2xl font-bold">Gestionar Activos</div>
            <div className="text-neutral-300 mt-1">Activos y licencias</div>
          </button>
        </div>
      </div>
    </div>
  );
}
