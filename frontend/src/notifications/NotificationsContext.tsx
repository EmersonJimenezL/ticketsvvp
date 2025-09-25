import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getTicketsSocket } from "../lib/socket";
import type { Ticket } from "../services/tickets";

type TicketEvent = "ticket:created" | "ticket:updated";

type NotificationItem = {
  id: string;
  type: TicketEvent;
  ticketId: string;
  title: string;
  description: string;
  receivedAt: string;
};

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function buildMessage(event: TicketEvent, ticket: Ticket): NotificationItem {
  const now = new Date().toISOString();
  if (event === "ticket:created") {
    return {
      id: `${event}-${ticket.ticketId}-${now}`,
      type: event,
      ticketId: ticket.ticketId,
      title: `Nuevo ticket ${ticket.ticketId}`,
      description: `${ticket.title} por ${ticket.userName}`,
      receivedAt: now,
    };
  }

  const status = ticket.state ? `estado: ${ticket.state}` : "actualizado";
  return {
    id: `${event}-${ticket.ticketId}-${now}`,
    type: event,
    ticketId: ticket.ticketId,
    title: `Ticket ${ticket.ticketId} actualizado`,
    description: `${ticket.title} (${status})`,
    receivedAt: now,
  };
}

function playNotificationSound() {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Ignorar si el navegador impide reproducir audio sin gesto previo
  }
}

type NotificationsProviderProps = {
  children: ReactNode;
  maxItems?: number;
};

export function NotificationsProvider({ children, maxItems = 30 }: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const socket = getTicketsSocket();
    if (!socket) {
      return;
    }

    const handler = (event: TicketEvent, ticket: Ticket) => {
      setNotifications((current) => {
        const next = [buildMessage(event, ticket), ...current];
        return next.slice(0, maxItems);
      });
      setUnread((count) => count + 1);
      playNotificationSound();
    };

    const createdListener = (ticket: Ticket) => handler("ticket:created", ticket);
    const updatedListener = (ticket: Ticket) => handler("ticket:updated", ticket);

    socket.on("ticket:created", createdListener);
    socket.on("ticket:updated", updatedListener);

    return () => {
      socket.off("ticket:created", createdListener);
      socket.off("ticket:updated", updatedListener);
    };
  }, [maxItems]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount: unread,
      markAllRead: () => setUnread(0),
      removeNotification: (id) =>
        setNotifications((current) => current.filter((item) => item.id !== id)),
    }),
    [notifications, unread]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications debe usarse dentro de NotificationsProvider");
  }
  return ctx;
}
