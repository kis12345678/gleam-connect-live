import { useState, useEffect, useCallback } from "react";

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      // Only show if tab is not focused
      if (!document.hidden) return;
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return notification;
    },
    []
  );

  return { permission, requestPermission, showNotification };
}
