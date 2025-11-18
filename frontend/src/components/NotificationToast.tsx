import type { NotificationData } from "../services/socket";

type Props = {
  notification: NotificationData;
  onClose: () => void;
};

export default function NotificationToast({ notification, onClose }: Props) {
  const isAssignment = notification.type === "ticketAsignado";

  return (
    <div
      className={`rounded-xl border backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)] p-4 min-w-[300px] max-w-[400px] animate-slide-in ${
        isAssignment
          ? "border-orange-500/30 bg-orange-500/10"
          : "border-blue-500/30 bg-blue-500/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`h-2 w-2 rounded-full ${
                isAssignment ? "bg-orange-500" : "bg-blue-500"
              }`}
            />
            <h4 className="font-bold text-sm text-neutral-100">
              {notification.title}
            </h4>
          </div>
          <p className="text-sm text-neutral-300">{notification.message}</p>
          <p className="text-xs text-neutral-400 mt-1">
            {new Date(notification.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-100 transition"
          aria-label="Cerrar notificación"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
