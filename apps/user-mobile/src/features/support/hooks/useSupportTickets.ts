/**
 * Support Tickets List Hook
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/services/auth";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { supportRepository } from "../api/support-adapter";
import type { SupportTicketRecord } from "../types/support.types";

export function useSupportTickets(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "AUTHENTICATED";

  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const fetchTickets = useCallback(
    async (isRefresh = false) => {
      if (!enabled || !isAuthenticated) {
        setTickets([]);
        setTotal(0);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (inFlightRef.current && !isRefresh) return;
      inFlightRef.current = true;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const response = await supportRepository.getTickets();
        if (!isMountedRef.current) return;

        setTickets(response.items);
        setTotal(response.total);
        queryCache.set(QUERY_KEYS.support.list(), response);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        setErrorMessage(mapApiErrorToUserMessage(err));
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          inFlightRef.current = false;
        }
      }
    },
    [enabled, isAuthenticated],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchTickets();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTickets]);

  useEffect(() => {
    const unsub = queryCache.subscribe(QUERY_KEYS.support.list(), () => {
      fetchTickets(false);
    });
    return () => {
      unsub();
    };
  }, [fetchTickets]);

  return {
    tickets,
    total,
    isLoading,
    isRefreshing,
    errorMessage,
    refetch: () => fetchTickets(false),
    refresh: () => fetchTickets(true),
  };
}
