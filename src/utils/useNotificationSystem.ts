import { useState, useEffect, useCallback } from "react";
import { AppNotification } from "../types";
import { sound } from "./audio";

const FAVORITES_STORAGE_KEY = "dt_favorite_rooms";
const NOTIFICATIONS_STORAGE_KEY = "dt_inapp_notifications";

export function useNotificationSystem(userId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [favoriteRoomIds, setFavoriteRoomIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ["classic", "express"];
    } catch {
      return ["classic", "express"];
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeBanner, setActiveBanner] = useState<AppNotification | null>(null);

  // Check initial permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Sync favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteRoomIds));
    } catch (e) {
      console.warn("Failed to persist favorites:", e);
    }
  }, [favoriteRoomIds]);

  // Request browser push permission
  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        sendNotification({
          title: "🔔 Notifications Enabled!",
          body: "You'll now get instant alerts when rounds start in your favorite rooms or friends join!",
          type: "system",
        });
      }
      return result;
    } catch {
      return "denied";
    }
  }, []);

  // Send Notification (Browser Push + In-App Banner + Sound)
  const sendNotification = useCallback(
    ({
      title,
      body,
      type = "system",
      roomId,
      actionUrl,
    }: {
      title: string;
      body: string;
      type?: AppNotification["type"];
      roomId?: string;
      actionUrl?: string;
    }) => {
      const newNotif: AppNotification = {
        id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        title,
        body,
        type,
        timestamp: new Date().toISOString(),
        roomId,
        read: false,
        actionUrl,
      };

      // 1. Play sound
      try {
        sound.playButtonClick();
      } catch {}

      // 2. Browser push notification
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(title, {
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: roomId || "general",
          });
        } catch {
          // Push notification error fallback
        }
      }

      // 3. In-App Banner Popup
      setActiveBanner(newNotif);
      setTimeout(() => {
        setActiveBanner((current) => (current?.id === newNotif.id ? null : current));
      }, 5000);

      // 4. Save to history
      setNotifications((prev) => {
        const updated = [newNotif, ...prev.slice(0, 19)];
        try {
          localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  // Toggle Favorite Room
  const toggleFavoriteRoom = useCallback((roomId: string) => {
    setFavoriteRoomIds((prev) => {
      const exists = prev.includes(roomId);
      const next = exists ? prev.filter((id) => id !== roomId) : [...prev, roomId];
      sound.playButtonClick();
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (roomId: string) => favoriteRoomIds.includes(roomId),
    [favoriteRoomIds]
  );

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    } catch {}
  }, []);

  return {
    permission,
    requestPermission,
    sendNotification,
    favoriteRoomIds,
    toggleFavoriteRoom,
    isFavorite,
    notifications,
    activeBanner,
    dismissBanner: () => setActiveBanner(null),
    clearNotification,
    clearAllNotifications,
  };
}
