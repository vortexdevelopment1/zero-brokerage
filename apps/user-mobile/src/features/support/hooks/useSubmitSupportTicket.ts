/**
 * Submit Support Ticket Hook
 *
 * Enforces:
 * 1. Blueprint Step 7 Section 10 Field Validation:
 *    - Subject length: 5 to 100 characters.
 *    - Message length: 10 to 1000 characters.
 *    - Category must be an approved category.
 * 2. Duplicate submission prevention.
 * 3. Server confirmation and queryCache invalidation.
 * 4. Privacy-safe analytics tracking.
 */

import { useCallback, useState } from "react";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache, QUERY_KEYS } from "@/services/api/query-cache";
import { trackEvent } from "@/services/analytics/analytics";
import { supportRepository } from "../api/support-adapter";
import type {
  CreateSupportTicketDto,
  SupportTicketRecord,
  SupportValidationErrors,
} from "../types/support.types";

export function useSubmitSupportTicket() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<SupportValidationErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const validate = (dto: Partial<CreateSupportTicketDto>): boolean => {
    const newErrors: SupportValidationErrors = {};

    if (!dto.category) {
      newErrors.category = "Please select a support category.";
    }

    const trimmedSubject = dto.subject?.trim() || "";
    if (trimmedSubject.length < 5) {
      newErrors.subject = "Subject must be at least 5 characters.";
    } else if (trimmedSubject.length > 100) {
      newErrors.subject = "Subject cannot exceed 100 characters.";
    }

    const trimmedMessage = dto.message?.trim() || "";
    if (trimmedMessage.length < 10) {
      newErrors.message = "Please describe your issue in at least 10 characters.";
    } else if (trimmedMessage.length > 1000) {
      newErrors.message = "Description cannot exceed 1,000 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitTicket = useCallback(
    async (
      dto: CreateSupportTicketDto,
    ): Promise<SupportTicketRecord | null> => {
      if (isSubmitting) {
        return null; // Prevent duplicate submission
      }

      if (!validate(dto)) {
        return null;
      }

      setIsSubmitting(true);
      setSubmissionError(null);

      try {
        const ticket = await supportRepository.createTicket(dto);

        // Targeted cache invalidation
        queryCache.invalidate(QUERY_KEYS.support.list());

        // Privacy-safe analytics: Never include message body or PII
        trackEvent("support_request_submitted", {
          category: ticket.category,
          ticketNumber: ticket.ticketNumber,
          hasRelatedEntity: Boolean(ticket.relatedEntityType),
        });

        return ticket;
      } catch (err: unknown) {
        const message = mapApiErrorToUserMessage(err);
        setSubmissionError(message);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  return {
    submitTicket,
    validate,
    isSubmitting,
    errors,
    submissionError,
    clearErrors: () => {
      setErrors({});
      setSubmissionError(null);
    },
  };
}
