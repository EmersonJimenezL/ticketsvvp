import { io, type Socket } from "socket.io-client";

let ticketsSocket: Socket | null = null;

function resolveSocketUrl() {
  const base = import.meta.env.VITE_API_BASE;
  if (!base) {
    throw new Error("VITE_API_BASE no esta configurado");
  }
  try {
    const url = new URL(base, window.location.origin);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    console.error("[socket] URL invalida para tickets", error);
    return base;
  }
}

export function getTicketsSocket() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!ticketsSocket) {
    const url = resolveSocketUrl();
    ticketsSocket = io(url, {
      transports: ["websocket"],
      withCredentials: true,
    });
  }
  return ticketsSocket;
}

export function disconnectTicketsSocket() {
  ticketsSocket?.disconnect();
  ticketsSocket = null;
}
