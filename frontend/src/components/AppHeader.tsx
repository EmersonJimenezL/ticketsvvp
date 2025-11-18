import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
};

export default function AppHeader({
  title,
  subtitle,
  showBackButton = true,
  backTo,
}: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  // Construir nombre completo del usuario
  const userFullName = user
    ? `${user.pnombre || ""} ${user.papellido || ""}`.trim() ||
      user.nombreUsuario ||
      user.usuario
    : "";

  const userUsername = user?.nombreUsuario || user?.usuario || "";

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Título y subtítulo */}
        <div className="flex-1 min-w-0">
          {title && (
            <h2 className="text-2xl font-extrabold tracking-tight truncate">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-neutral-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>

        {/* Usuario logueado y botones */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Indicador de usuario */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <div className="text-sm">
                <div className="font-semibold text-neutral-100">
                  {userFullName}
                </div>
                <div className="text-xs text-neutral-400">@{userUsername}</div>
              </div>
            </div>
          </div>

          {/* Botón Volver */}
          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-white/10 hover:border-orange-500/50"
            >
              Volver
            </button>
          )}

          {/* Botón Cerrar sesión */}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 hover:border-red-500/50"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
