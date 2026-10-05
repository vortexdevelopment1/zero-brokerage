/**
 * useSubmitInquiry Hook
 * Handles inquiry submission with validation, single-submission lock, and cache invalidation.
 */

import { useCallback, useState } from "react";
import { isValidUuid } from "@/navigation/routes";
import { QUERY_KEYS, queryCache } from "@/services/api/query-cache";
import { mapApiErrorToUserMessage } from "@/services/api/errors";
import { submitInquiry } from "../api/inquiries-api";
import type { InquiryRecord, SubmitInquiryDto } from "../types/inquiries.types";

export interface UseSubmitInquiryResult {
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly clearError: () => void;
  readonly handleSubmitInquiry: (
    dto: SubmitInquiryDto,
  ) => Promise<InquiryRecord | null>;
}

export function useSubmitInquiry(): UseSubmitInquiryResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleSubmitInquiry = useCallback(
    async (dto: SubmitInquiryDto): Promise<InquiryRecord | null> => {
      if (isSubmitting) return null;

      // Client-side validation matching backend Zod schema
      const sanitizedListingId = dto.listingId?.trim() ?? "";
      if (!isValidUuid(sanitizedListingId)) {
        const msg = "Invalid property identifier.";
        setError(msg);
        throw new Error(msg);
      }

      const trimmedMessage = dto.message?.trim() ?? "";
      if (trimmedMessage.length < 10) {
        const msg = "Inquiry message must be at least 10 characters.";
        setError(msg);
        throw new Error(msg);
      }

      if (trimmedMessage.length > 1000) {
        const msg = "Inquiry message cannot exceed 1000 characters.";
        setError(msg);
        throw new Error(msg);
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const record = await submitInquiry({
          listingId: sanitizedListingId,
          message: trimmedMessage,
        });

        // Invalidate inquiries list
        queryCache.invalidate(QUERY_KEYS.inquiries.list());

        return record;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  return {
    isSubmitting,
    error,
    clearError,
    handleSubmitInquiry,
  };
}
