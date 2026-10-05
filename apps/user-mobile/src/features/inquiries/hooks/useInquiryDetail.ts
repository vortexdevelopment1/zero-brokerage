/**
 * useInquiryDetail Hook
 * Authoritative single inquiry detail query with strict UUID validation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isValidUuid } from "@/navigation/routes";
import { QUERY_KEYS, queryCache } from "@/services/api/query-cache";
import { mapApiErrorToUserMessage } from "@/services/api/errors";
import { getInquiryById } from "../api/inquiries-api";
import type { InquiryRecord } from "../types/inquiries.types";

export interface UseInquiryDetailResult {
  readonly inquiry: InquiryRecord | null;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly isInvalidId: boolean;
  readonly error: Error | null;
  readonly errorMessage: string | null;
  readonly refetch: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export function useInquiryDetail(
  inquiryId: string | undefined | null,
  options?: { enabled?: boolean },
): UseInquiryDetailResult {
  const isIdValid = !!inquiryId && isValidUuid(inquiryId);
  const enabled = (options?.enabled ?? true) && isIdValid;

  const [inquiry, setInquiry] = useState<InquiryRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDetail = useCallback(
    async (isRefresh = false) => {
      if (!inquiryId || !isIdValid) return;

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
        const res = await getInquiryById(inquiryId, controller.signal);
        setInquiry(res);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const stdErr = err instanceof Error ? err : new Error(String(err));
        setError(stdErr);
        setErrorMessage(mapApiErrorToUserMessage(err));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [inquiryId, isIdValid],
  );

  useEffect(() => {
    if (enabled) {
      fetchDetail(false);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchDetail]);

  useEffect(() => {
    if (!enabled || !inquiryId) return;
    const unsubscribe = queryCache.subscribe(
      QUERY_KEYS.inquiries.detail(inquiryId),
      () => {
        fetchDetail(false);
      },
    );
    return unsubscribe;
  }, [enabled, inquiryId, fetchDetail]);

  const refetch = useCallback(() => fetchDetail(false), [fetchDetail]);
  const refresh = useCallback(() => fetchDetail(true), [fetchDetail]);

  return {
    inquiry,
    isLoading,
    isRefreshing,
    isInvalidId: !isIdValid,
    error,
    errorMessage,
    refetch,
    refresh,
  };
}
