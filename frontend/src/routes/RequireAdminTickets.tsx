import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";

export default function RequireAdminTickets() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isTicketAdmin(user)) return <Navigate to="/menu" replace />;
  return <Outlet />;
}
