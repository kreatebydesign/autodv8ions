"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  formatNotificationBadgeCount,
  type GmailNotificationItem,
} from "@/lib/google/gmail-notifications";

type NotificationsState = {
  configured: boolean;
  count: number;
  items: GmailNotificationItem[];
  loading: boolean;
  error: string | null;
  badgeLabel: string | null;
  refresh: () => Promise<void>;
};

const GmailNotificationsContext = createContext<NotificationsState | null>(null);

export function useGmailNotifications() {
  const ctx = useContext(GmailNotificationsContext);
  if (!ctx) {
    throw new Error("useGmailNotifications must be used within GmailNotificationsProvider");
  }
  return ctx;
}

/** Safe optional hook for components that may render outside provider in tests. */
export function useGmailNotificationsOptional() {
  return useContext(GmailNotificationsContext);
}

export default function GmailNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [configured, setConfigured] = useState(true);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<GmailNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gmail-notifications", {
        credentials: "include",
        cache: "no-store",
      });
      let data: {
        configured?: boolean;
        count?: number;
        items?: GmailNotificationItem[];
        error?: string;
        code?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (data.configured === false) {
        setConfigured(false);
        setCount(0);
        setItems([]);
        setError(null);
        return;
      }

      setConfigured(true);

      if (!res.ok) {
        setCount(0);
        setItems([]);
        setError(data.error || "Could not load customer replies.");
        return;
      }

      setCount(Number(data.count || 0));
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setCount(0);
      setItems([]);
      setError("Could not load customer replies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  const value = useMemo<NotificationsState>(
    () => ({
      configured,
      count,
      items,
      loading,
      error,
      badgeLabel: formatNotificationBadgeCount(count),
      refresh,
    }),
    [configured, count, items, loading, error, refresh],
  );

  return (
    <GmailNotificationsContext.Provider value={value}>
      {children}
    </GmailNotificationsContext.Provider>
  );
}
