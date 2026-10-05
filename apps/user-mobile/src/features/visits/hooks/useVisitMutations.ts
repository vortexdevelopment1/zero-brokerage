/**
 * useVisitMutations Hook
 * Provides requestVisit, cancelVisit, and rescheduleVisit mutations with
 * single-submission locks, precise error capturing, and targeted cache invalidations.
 */

import { useCallback, useState } from "react";
import { QUERY_KEYS, queryCache } from "@/services/api/query-cache";
import { mapApiErrorToUserMessage } from "@/services/api/errors";
import { cancelVisit, requestVisit, rescheduleVisit } from "../api/visits-api";
import type {
  CancelVisitDto,
  RequestVisitDto,
  RescheduleVisitDto,
  VisitRecord,
} from "../types/visits.types";

export interface UseVisitMutationsResult {
  readonly isRequesting: boolean;
  readonly isCancelling: boolean;
  readonly isRescheduling: boolean;
  readonly mutationError: string | null;
  readonly clearError: () => void;
  readonly handleRequestVisit: (
    dto: RequestVisitDto,
  ) => Promise<VisitRecord | null>;
  readonly handleCancelVisit: (
    visitId: string,
    dto?: CancelVisitDto,
  ) => Promise<VisitRecord | null>;
  readonly handleRescheduleVisit: (
    visitId: string,
    dto: RescheduleVisitDto,
  ) => Promise<VisitRecord | null>;
}

export function useVisitMutations(): UseVisitMutationsResult {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setMutationError(null);
  }, []);

  const handleRequestVisit = useCallback(
    async (dto: RequestVisitDto): Promise<VisitRecord | null> => {
      if (isRequesting) return null;
      setIsRequesting(true);
      setMutationError(null);

      try {
        const record = await requestVisit(dto);
        // Targeted cache invalidation
        queryCache.invalidate(QUERY_KEYS.visits.list());
        queryCache.invalidate(QUERY_KEYS.visits.availability(dto.listingId));
        return record;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setMutationError(msg);
        throw err;
      } finally {
        setIsRequesting(false);
      }
    },
    [isRequesting],
  );

  const handleCancelVisit = useCallback(
    async (
      visitId: string,
      dto?: CancelVisitDto,
    ): Promise<VisitRecord | null> => {
      if (isCancelling) return null;
      setIsCancelling(true);
      setMutationError(null);

      try {
        const record = await cancelVisit(visitId, dto);
        // Targeted cache invalidation
        queryCache.invalidate(QUERY_KEYS.visits.list());
        queryCache.invalidate(QUERY_KEYS.visits.detail(visitId));
        return record;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setMutationError(msg);
        throw err;
      } finally {
        setIsCancelling(false);
      }
    },
    [isCancelling],
  );

  const handleRescheduleVisit = useCallback(
    async (
      visitId: string,
      dto: RescheduleVisitDto,
    ): Promise<VisitRecord | null> => {
      if (isRescheduling) return null;
      setIsRescheduling(true);
      setMutationError(null);

      try {
        const record = await rescheduleVisit(visitId, dto);
        // Targeted cache invalidation
        queryCache.invalidate(QUERY_KEYS.visits.list());
        queryCache.invalidate(QUERY_KEYS.visits.detail(visitId));
        return record;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setMutationError(msg);
        throw err;
      } finally {
        setIsRescheduling(false);
      }
    },
    [isRescheduling],
  );

  return {
    isRequesting,
    isCancelling,
    isRescheduling,
    mutationError,
    clearError,
    handleRequestVisit,
    handleCancelVisit,
    handleRescheduleVisit,
  };
}
