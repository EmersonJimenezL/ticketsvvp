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
  risk: "alto" | "medio" | "bajo";
  state: "recibido" | "enProceso" | "resuelto" | "conDificultades";
  ticketTime?: Date;
  resolucionTime?: Date;
  comment?: string;
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
