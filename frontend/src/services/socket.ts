import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://192.168.200.80:3006";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(username: string) {
  const socket = getSocket();

  if (!socket.connected) {
    socket.connect();

    socket.on("connect", () => {
      console.log("[Socket] Conectado al servidor");
      // Registrar el usuario para notificaciones personalizadas
      socket.emit("register", { username });
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Desconectado del servidor");
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Error de conexión:", error);
    });
  }
}

export function disconnectSocket() {
  const socket = getSocket();
  if (socket.connected) {
    socket.disconnect();
  }
}

export type NotificationType = "ticketAsignado" | "nuevoTicket";

export type NotificationData = {
  type: NotificationType;
  ticketId: string;
  title: string;
  message: string;
  timestamp: string;
};

export function onNotification(
  callback: (data: NotificationData) => void
): () => void {
  const socket = getSocket();

  // Escuchar notificación de ticket asignado
  const handleTicketAsignado = (data: any) => {
    callback({
      type: "ticketAsignado",
      ticketId: data.ticketId,
      title: "Ticket Asignado",
      message: `Se te asignó el ticket ${data.ticketId}`,
      timestamp: new Date().toISOString(),
    });
  };

  // Escuchar notificación de nuevo ticket
  const handleNuevoTicket = (data: any) => {
    callback({
      type: "nuevoTicket",
      ticketId: data.ticketId,
      title: "Nuevo Ticket",
      message: `Nuevo ticket creado: ${data.title || data.ticketId}`,
      timestamp: new Date().toISOString(),
    });
  };

  socket.on("ticketAsignado", handleTicketAsignado);
  socket.on("nuevoTicket", handleNuevoTicket);

  // Retornar función de limpieza
  return () => {
    socket.off("ticketAsignado", handleTicketAsignado);
    socket.off("nuevoTicket", handleNuevoTicket);
  };
}
