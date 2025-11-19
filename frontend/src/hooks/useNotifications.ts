import { useEffect, useState, useCallback, useRef } from "react";
import { onNotification } from "../services/socket";
import type { NotificationData } from "../services/socket";

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

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
      addNotification(data);
    });

    return cleanup;
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
  };
}
