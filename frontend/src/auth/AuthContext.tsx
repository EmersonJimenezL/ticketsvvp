// src/auth/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** Ajusta aquí tus políticas de sesión */
export const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutos de inactividad
export const ABS_MAX_SESSION_MS = 8 * 60 * 60 * 1000; // 8 horas de sesión absoluta

type Usuario = {
  nombreUsuario: string;
  rol: string;
  primerNombre?: string;
  primerApellido?: string;
};

type AuthContextType = {
  user: Usuario | null;
  isAuth: boolean;
  hydrated: boolean; // true cuando ya se restauró/decidió la sesión
  login: (u: Usuario) => void;
  logout: () => void;
  touch: () => void; // marca actividad para reiniciar el timer de inactividad
};

const STORAGE_KEY = "usuario";
const STORAGE_ISSUED_AT = "usuario_issued_at";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const inactivityTimerRef = useRef<number | null>(null);
  const issuedAtRef = useRef<number | null>(null);

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const armInactivityTimer = () => {
    clearInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      doLogout(); // cierre por inactividad
    }, INACTIVITY_MS);
  };

  const doLogout = () => {
    clearInactivityTimer();
    setUser(null);
    issuedAtRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_ISSUED_AT);
  };

  const login = (u: Usuario) => {
    setUser(u);
    const now = Date.now();
    issuedAtRef.current = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    localStorage.setItem(STORAGE_ISSUED_AT, String(now));
    armInactivityTimer();
  };

  const touch = () => {
    if (!user) return;
    // expira por tiempo absoluto aunque haya actividad
    if (
      issuedAtRef.current &&
      Date.now() - issuedAtRef.current > ABS_MAX_SESSION_MS
    ) {
      doLogout();
      return;
    }
    armInactivityTimer();
  };

  const logout = () => doLogout();

  // Restaurar sesión en carga y setear listeners de actividad
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const issued = localStorage.getItem(STORAGE_ISSUED_AT);

      if (raw && issued) {
        const parsed = JSON.parse(raw) as Usuario;
        const issuedAt = Number(issued);
        issuedAtRef.current = issuedAt;

        if (
          Number.isFinite(issuedAt) &&
          Date.now() - issuedAt <= ABS_MAX_SESSION_MS
        ) {
          setUser(parsed);
          armInactivityTimer();
        } else {
          // vencida por tiempo absoluto
          doLogout();
        }
      }
    } catch {
      // si falla el parse, limpia
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_ISSUED_AT);
    } finally {
      setHydrated(true); // importante: no redirigir hasta hidratar
    }

    const events = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ] as const;
    const activityHandler = () => touch();
    const visHandler = () => {
      if (document.visibilityState === "visible") touch();
    };

    events.forEach((ev) =>
      window.addEventListener(ev, activityHandler, { passive: true })
    );
    document.addEventListener("visibilitychange", visHandler);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, activityHandler));
      document.removeEventListener("visibilitychange", visHandler);
      clearInactivityTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuth: !!user,
      hydrated,
      login,
      logout,
      touch,
    }),
    [user, hydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
