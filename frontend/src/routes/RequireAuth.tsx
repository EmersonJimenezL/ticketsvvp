import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RequireAuth() {
  const { isAuth, hydrated } = useAuth();
  const location = useLocation();

  // Mientras hidratamos desde localStorage, no decidas aún.
  if (!hydrated) return null; // o un loader minimal

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
