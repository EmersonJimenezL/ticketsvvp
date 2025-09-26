// src/services/tickets.ts
import { httpJSON } from "../lib/http";

export type Ticket = {
  ticketId: string;
  title:
    | "SAP"
    | "Impresoras"
    | "Cuentas"
    | "Rinde Gastos"
    | "Terreno"
    | "Otros";
  description: string;
  userId: string;
  userName: string;
  userLastName?: string;
  userFullName?: string;
  risk: "alto" | "medio" | "bajo";
  state: "recibido" | "enProceso" | "resuelto" | "conDificultades";
  ticketTime?: string;
  resolucionTime?: string;
  comment?: string;
  images?: string[]; // data URLs de imagenes opcionales
  createdAt?: string;
  updatedAt?: string;
};

// Para crear un ticket no pedimos campos automáticos como ticketTime/resolucionTime
export type TicketPayload = Omit<Ticket, "ticketTime" | "resolucionTime">;

export type TicketResponse = { ok: boolean; data?: any; error?: string };
export type ListResponse = {
  ok: boolean;
  count: number;
  data: Ticket[];
  error?: string;
};

export type TicketsByUserMetric = {
  userId: string;
  userName: string;
  userLastName?: string;
  userFullName?: string;
  total: number;
};

export type TicketsMetrics = {
  avgResolutionTimeHours: number | null;
  ticketsByCategory: { category: string; total: number }[];
  ticketsByUser: TicketsByUserMetric[];
  highRiskOpen: number;
  trend: { date: string; created: number; resolved: number }[];
};

export type TicketsMetricsResponse = {
  ok: boolean;
  data: TicketsMetrics;
  error?: string;
};
export function createTicket(payload: TicketPayload) {
  return httpJSON<TicketResponse>("tickets", "/api/ticketvvp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listTickets(params: {
  userId?: string;
  state?: Ticket["state"];
  title?: Ticket["title"];
  limit?: number;
  skip?: number;
}) {
  const qs = new URLSearchParams();
  if (params.userId) qs.set("userId", params.userId);
  if (params.state) qs.set("state", params.state);
  if (params.title) qs.set("title", params.title);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.skip != null) qs.set("skip", String(params.skip));
  const search = qs.toString() ? `?${qs.toString()}` : "";
  return httpJSON<ListResponse>("tickets", `/api/ticketvvp${search}`);
}

export function listPendingTicketsAdmin() {
  return httpJSON<ListResponse>("tickets", "/api/admin/tickets/pendientes");
}

export function fetchTicketsMetrics() {
  return httpJSON<TicketsMetricsResponse>(
    "tickets",
    "/api/admin/tickets/metrics"
  );
}

export function patchTicket(
  ticketId: string,
  payload: Partial<Pick<Ticket, "risk" | "state" | "comment">>
) {
  return httpJSON<TicketResponse>("tickets", `/api/ticketvvp/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
