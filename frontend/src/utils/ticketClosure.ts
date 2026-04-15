import type { Ticket } from "../services/tickets";

export const DEFAULT_TICKET_CLOSURE_WINDOW_HOURS = 24;

export function isTicketClosurePending(ticket: Ticket) {
  return ticket.state === "resuelto" && ticket.closureStatus === "pending";
}

export function isTicketClosureFinal(ticket: Ticket) {
  return ticket.state === "resuelto" && ticket.closureStatus !== "pending";
}

export function getTicketClosureRemainingMs(ticket: Ticket, nowMs = Date.now()) {
  if (!isTicketClosurePending(ticket) || !ticket.closureDeadlineAt) return null;
  const deadlineMs = new Date(ticket.closureDeadlineAt).getTime();
  if (!Number.isFinite(deadlineMs)) return null;
  return deadlineMs - nowMs;
}

export function formatTicketClosureRemaining(remainingMs: number) {
  if (remainingMs <= 0) return "Plazo vencido";

  const totalMinutes = Math.ceil(remainingMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(minutes, 1)}m`;
}

export function buildOptimisticPendingClosureTicket(
  ticket: Ticket,
  windowHours = DEFAULT_TICKET_CLOSURE_WINDOW_HOURS
): Ticket {
  const requestedAt = new Date();
  const deadlineAt = new Date(
    requestedAt.getTime() + windowHours * 60 * 60 * 1000
  );

  return {
    ...ticket,
    state: "resuelto",
    closureStatus: "pending",
    closureRequestedAt: requestedAt.toISOString(),
    closureDeadlineAt: deadlineAt.toISOString(),
    closureRespondedAt: undefined,
    closureResponseComment: undefined,
    closedAt: undefined,
    resolucionTime: ticket.resolucionTime || requestedAt.toISOString(),
  };
}
