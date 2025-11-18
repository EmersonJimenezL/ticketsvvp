import { useNotifications } from "../hooks/useNotifications";
import NotificationToast from "./NotificationToast";

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.timestamp} className="pointer-events-auto">
          <NotificationToast
            notification={notification}
            onClose={() => removeNotification(notification.timestamp)}
          />
        </div>
      ))}
    </div>
  );
}
