import { useMemo, useState } from "react";
import { useNotifications } from "./NotificationsContext";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

type NotificationsBellProps = {
  positionClassName?: string;
};

export function NotificationsBell({ positionClassName }: NotificationsBellProps) {
  const { notifications, unreadCount, markAllRead, removeNotification } = useNotifications();
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => notifications.slice(0, 10), [notifications]);

  return (
    <div
      className={
        positionClassName ||
        "pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
      }
    >
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          markAllRead();
        }}
        className="pointer-events-auto relative inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-3 text-neutral-100 shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur transition hover:bg-white/10"
        aria-label="Ver notificaciones de tickets"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.657a2 2 0 0 1-3.714 0M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="pointer-events-auto mt-2 w-72 max-w-[90vw] rounded-2xl border border-white/10 bg-neutral-950/95 p-3 text-sm text-neutral-100 shadow-[0_12px_35px_rgba(0,0,0,0.65)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Notificaciones</h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              Cerrar
            </button>
          </div>
          {grouped.length === 0 && (
            <p className="py-4 text-center text-neutral-500">Sin notificaciones recientes</p>
          )}
          <ul className="space-y-3">
            {grouped.map((item) => (
              <li key={item.id} className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-100">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-400">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNotification(item.id)}
                    className="ml-2 text-xs text-neutral-500 hover:text-neutral-200"
                    aria-label="Descartar notificacion"
                  >
                    x
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{formatTime(item.receivedAt)}</p>
              </li>
            ))}
          </ul>
          {notifications.length > grouped.length && (
            <p className="mt-3 text-center text-[0.7rem] uppercase tracking-wide text-neutral-500">
              Mostrando las ultimas {grouped.length} de {notifications.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

