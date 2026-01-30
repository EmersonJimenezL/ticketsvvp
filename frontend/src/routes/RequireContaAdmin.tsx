import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isContaAdmin } from "../auth/isContaAdmin";

export default function RequireContaAdmin() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isContaAdmin(user)) return <Navigate to="/menu" replace />;
  return <Outlet />;
}
