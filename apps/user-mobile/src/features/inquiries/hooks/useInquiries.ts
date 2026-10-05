/**
 * useInquiries Hook
 * Fetches and manages user's inquiries list with cache subscription and auto-refetch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { QUERY_KEYS, queryCache } from "@/services/api/query-cache";
import { mapApiErrorToUserMessage } from "@/services/api/errors";
import { getInquiries } from "../api/inquiries-api";
import type { InquiryRecord } from "../types/inquiries.types";

export interface UseInquiriesResult {
  readonly inquiries: InquiryRecord[];
  readonly total: number;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly error: Error | null;
  readonly errorMessage: string | null;
  readonly refetch: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export function useInquiries(options?: {
  enabled?: boolean;
}): UseInquiriesResult {
  const enabled = options?.enabled ?? true;
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchInquiries = useCallback(async (isRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setErrorMessage(null);

    try {
      const res = await getInquiries(controller.signal);
      setInquiries(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const stdErr = err instanceof Error ? err : new Error(String(err));
      setError(stdErr);
      setErrorMessage(mapApiErrorToUserMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      fetchInquiries(false);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchInquiries]);

  // Subscribe to inquiries.list cache invalidation
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = queryCache.subscribe(
      QUERY_KEYS.inquiries.list(),
      () => {
        fetchInquiries(false);
      },
    );
    return unsubscribe;
  }, [enabled, fetchInquiries]);

  const refetch = useCallback(() => fetchInquiries(false), [fetchInquiries]);
  const refresh = useCallback(() => fetchInquiries(true), [fetchInquiries]);

  return {
    inquiries,
    total,
    isLoading,
    isRefreshing,
    error,
    errorMessage,
    refetch,
    refresh,
  };
}
