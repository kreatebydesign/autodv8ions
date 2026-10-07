"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  GMAIL_NOTIFICATIONS_POLL_INTERVAL_MS,
  applyGmailNotificationsRefreshResult,
  formatNotificationBadgeCount,
  noteOverlappingGmailRefresh,
  shouldRefreshGmailNotificationsOnVisibility,
  shouldScheduleGmailNotificationPoll,
  type GmailNotificationItem,
  type GmailNotificationsFetchOutcome,
  type GmailNotificationsUiState,
} from "@/lib/google/gmail-notifications";

export type GmailNotificationsRefreshOptions = {
  /** Skip loading spinner — used for idle poll / visibility refresh. */
  silent?: boolean;
};

type NotificationsState = {
  configured: boolean;
  count: number;
  items: GmailNotificationItem[];
  loading: boolean;
  error: string | null;
  badgeLabel: string | null;
  refresh: (options?: GmailNotificationsRefreshOptions) => Promise<void>;
};

const GmailNotificationsContext = createContext<NotificationsState | null>(null);

const INITIAL_UI_STATE: GmailNotificationsUiState = {
  configured: true,
  count: 0,
  items: [],
  error: null,
};

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
  const [configured, setConfigured] = useState(INITIAL_UI_STATE.configured);
  const [count, setCount] = useState(INITIAL_UI_STATE.count);
  const [items, setItems] = useState<GmailNotificationItem[]>(INITIAL_UI_STATE.items);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(INITIAL_UI_STATE.error);

  const uiStateRef = useRef<GmailNotificationsUiState>(INITIAL_UI_STATE);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const pendingSilentRef = useRef(true);
  const refreshRef = useRef<(options?: GmailNotificationsRefreshOptions) => Promise<void>>(
    async () => {},
  );

  const commitUiState = useCallback((next: GmailNotificationsUiState) => {
    uiStateRef.current = next;
    setConfigured(next.configured);
    setCount(next.count);
    setItems(next.items);
    setError(next.error);
  }, []);

  const refresh = useCallback(async (options?: GmailNotificationsRefreshOptions) => {
    const requestedSilent = Boolean(options?.silent);

    const overlap = noteOverlappingGmailRefresh({
      inFlight: inFlightRef.current,
      pending: pendingRef.current,
      pendingSilent: pendingSilentRef.current,
      incomingSilent: requestedSilent,
    });
    if (!overlap.accepted) {
      pendingRef.current = overlap.pending;
      pendingSilentRef.current = overlap.pendingSilent;
      return;
    }

    inFlightRef.current = true;
    let silent = requestedSilent;
    // Baseline for any calls deferred while this run is in flight.
    pendingSilentRef.current = true;

    try {
      for (;;) {
        pendingRef.current = false;

        if (!silent) {
          setLoading(true);
          setError(null);
        }

        let outcome: GmailNotificationsFetchOutcome;
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
            outcome = { kind: "not_configured" };
          } else if (!res.ok) {
            outcome = {
              kind: "http_error",
              message: data.error || "Could not load customer replies.",
            };
          } else {
            outcome = {
              kind: "success",
              count: Number(data.count || 0),
              items: Array.isArray(data.items) ? data.items : [],
            };
          }
        } catch {
          outcome = { kind: "network_error" };
        }

        commitUiState(
          applyGmailNotificationsRefreshResult({
            previous: uiStateRef.current,
            silent,
            outcome,
          }),
        );

        if (!silent) setLoading(false);

        if (!pendingRef.current) break;
        silent = pendingSilentRef.current;
        pendingSilentRef.current = true;
      }
    } finally {
      inFlightRef.current = false;
    }

    // Rare race: a defer arrived after the last pending check but before inFlight cleared.
    if (pendingRef.current) {
      const followSilent = pendingSilentRef.current;
      pendingRef.current = false;
      pendingSilentRef.current = true;
      void refreshRef.current({ silent: followSilent });
    }
  }, [commitUiState]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Pathname navigation: full refresh (preserves prior behavior).
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  // Idle poll while visible; pause when hidden; refresh on return.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startPoll = () => {
      clearPoll();
      if (
        typeof document !== "undefined" &&
        !shouldScheduleGmailNotificationPoll(document.hidden)
      ) {
        return;
      }
      intervalId = setInterval(() => {
        if (
          typeof document !== "undefined" &&
          !shouldScheduleGmailNotificationPoll(document.hidden)
        ) {
          return;
        }
        void refresh({ silent: true });
      }, GMAIL_NOTIFICATIONS_POLL_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (typeof document === "undefined") return;
      if (shouldRefreshGmailNotificationsOnVisibility(document.visibilityState)) {
        void refresh({ silent: true });
        startPoll();
      } else {
        clearPoll();
      }
    };

    if (typeof document !== "undefined") {
      if (shouldScheduleGmailNotificationPoll(document.hidden)) {
        startPoll();
      }
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      clearPoll();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [refresh]);

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
