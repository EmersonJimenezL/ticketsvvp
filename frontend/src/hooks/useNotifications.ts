import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { onNotification } from "../services/socket";
import type { NotificationData } from "../services/socket";
import { useAuth } from "../auth/AuthContext";
import { isTicketAdmin } from "../auth/isTicketAdmin";

function normalizeValue(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isAdmin = useMemo(() => isTicketAdmin(user || undefined), [user]);

  const currentUsername = useMemo(
    () => normalizeValue(user?.nombreUsuario || user?.usuario),
    [user]
  );
  const currentFullName = useMemo(() => {
    const full =
      (user?.primerNombre || user?.pnombre || "") +
      " " +
      (user?.primerApellido || user?.papellido || "");
    return normalizeValue(full);
  }, [user]);
  const currentEmail = useMemo(
    () => normalizeValue(user?.email),
    [user]
  );

  const shouldNotify = useCallback(
    (notification: NotificationData) => {
      if (!user) return false;

      if (notification.type === "nuevoTicket") {
        return isAdmin;
      }

      if (notification.type === "ticketAsignado") {
        if (isAdmin) {
          return false;
        }

        const raw = notification.raw || {};
        const candidates = [
          raw.userId,
          raw.usuario,
          raw.username,
          raw.user,
          raw.owner,
          raw.createdBy,
          raw.solicitante,
          raw.requester,
          raw.destinatario,
          raw.to,
          raw.email,
          raw.userEmail,
          raw.correo,
          raw.asignadoA,
          raw.assignedTo,
          raw.asignadoPara,
          raw.userName,
          raw.userFullName,
        ]
          .filter((value) => typeof value === "string")
          .map((value) => normalizeValue(value));

        if (!candidates.length) {
          return false;
        }

        return candidates.some(
          (value) =>
            (currentUsername && value === currentUsername) ||
            (currentEmail && value === currentEmail) ||
            (currentFullName && value === currentFullName)
        );
      }

      return true;
    },
    [user, isAdmin, currentUsername, currentEmail, currentFullName]
  );

  // Función para obtener o crear el AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
        }
      } catch (err) {
        console.warn("[Notificación] AudioContext no disponible:", err);
      }
    }
    return audioContextRef.current;
  }, []);

  // Limpiar AudioContext al desmontar
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playNotificationSound = useCallback(async () => {
    try {
      const audioContext = getAudioContext();
      if (!audioContext) {
        console.warn("[Notificación] AudioContext no disponible");
        return;
      }

      // Reanudar el contexto si está suspendido (requerido por políticas de autoplay)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Crear oscillator para generar el beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar el beep (frecuencia 800Hz, duración 200ms)
      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.2
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.warn("[Notificación] No se pudo reproducir el sonido:", err);
    }
  }, [getAudioContext]);

  const addNotification = useCallback(
    (notification: NotificationData) => {
      setNotifications((prev) => [notification, ...prev]);
      playNotificationSound();

      // Auto-remover después de 8 segundos
      setTimeout(() => {
        removeNotification(notification.timestamp);
      }, 8000);
    },
    [playNotificationSound]
  );

  const removeNotification = useCallback((timestamp: string) => {
    setNotifications((prev) =>
      prev.filter((n) => n.timestamp !== timestamp)
    );
  }, []);

  useEffect(() => {
    // Escuchar notificaciones desde socket
    const cleanup = onNotification((data) => {
      if (shouldNotify(data)) {
        addNotification(data);
      }
    });

    return cleanup;
  }, [addNotification, shouldNotify]);

  return {
    notifications,
    addNotification,
    removeNotification,
  };
}
