/**
 * Furniture Mutations Hook
 *
 * Provides operations for:
 * 1. Submitting a new checkout order
 * 2. Requesting cancellation of eligible orders
 * 3. Submitting return requests with preferred pickup dates
 * 4. Filing damage claims with evidence metadata
 *
 * Enforces query cache invalidation and privacy-safe analytics.
 */

import { useCallback, useState } from "react";
import { useAuthStore } from "@/services/auth";
import { mapApiErrorToUserMessage } from "@/services/api";
import { queryCache } from "@/services/api/query-cache";
import { trackEvent, ANALYTICS_EVENTS } from "@/services/analytics/analytics";
import { furnitureRepository } from "../api/furniture-adapter";
import type {
  CreateFurnitureOrderInput,
  CancelFurnitureOrderInput,
  RequestFurnitureReturnInput,
  FileDamageClaimInput,
  FurnitureOrder,
} from "../types/furniture.types";

export function useFurnitureMutations() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const userId = user?.id || "fixture-user-00000000-0000-4000-8000-000000000001";

  const invalidateOrderCaches = useCallback((orderId?: string) => {
    queryCache.invalidate("furniture.orders");
    if (orderId) {
      queryCache.invalidate(`furniture.orderDetail:${orderId}`);
    }
  }, []);

  const createOrder = useCallback(
    async (request: CreateFurnitureOrderInput): Promise<FurnitureOrder | null> => {
      setIsSubmitting(true);
      setMutationError(null);

      try {
        const order = await furnitureRepository.createOrder(request, userId);

        invalidateOrderCaches(order.id);

        trackEvent(ANALYTICS_EVENTS.FURNITURE_ORDER_SUBMITTED, {
          order_id: order.id,
          mode: order.mode,
          status: order.status,
          item_count: order.items.length,
        });

        return order;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setMutationError(msg);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [invalidateOrderCaches, userId],
  );

  const cancelOrder = useCallback(
    async (orderId: string, input: CancelFurnitureOrderInput): Promise<FurnitureOrder | null> => {
      setIsSubmitting(true);
      setMutationError(null);

      try {
        const order = await furnitureRepository.cancelOrder(orderId, input, userId);

        invalidateOrderCaches(orderId);

        trackEvent(ANALYTICS_EVENTS.FURNITURE_CANCEL_INITIATED, {
          order_id: orderId,
        });

        return order;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setMutationError(msg);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [invalidateOrderCaches, userId],
  );

  const requestReturn = useCallback(
    async (orderId: string, input: RequestFurnitureReturnInput): Promise<FurnitureOrder | null> => {
      setIsSubmitting(true);
      setMutationError(null);

      try {
        const order = await furnitureRepository.requestReturn(orderId, input, userId);

        invalidateOrderCaches(orderId);

        trackEvent(ANALYTICS_EVENTS.FURNITURE_RETURN_INITIATED, {
          order_id: orderId,
        });

        return order;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setMutationError(msg);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [invalidateOrderCaches, userId],
  );

  const submitDamageClaim = useCallback(
    async (orderId: string, input: FileDamageClaimInput): Promise<FurnitureOrder | null> => {
      setIsSubmitting(true);
      setMutationError(null);

      try {
        const order = await furnitureRepository.fileDamageClaim(orderId, input, userId);

        invalidateOrderCaches(orderId);

        trackEvent(ANALYTICS_EVENTS.FURNITURE_CLAIM_INITIATED, {
          order_id: orderId,
        });

        return order;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setMutationError(msg);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [invalidateOrderCaches, userId],
  );

  const retryPayment = useCallback(
    async (orderId: string): Promise<FurnitureOrder | null> => {
      setIsSubmitting(true);
      setMutationError(null);

      try {
        const order = await furnitureRepository.retryPayment(orderId, userId);

        invalidateOrderCaches(orderId);

        trackEvent(ANALYTICS_EVENTS.FURNITURE_PAYMENT_STATUS_VIEWED, {
          order_id: orderId,
          payment_status: order.paymentStatus,
        });

        return order;
      } catch (err: unknown) {
        const msg = mapApiErrorToUserMessage(err);
        setMutationError(msg);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [invalidateOrderCaches, userId],
  );

  return {
    isSubmitting,
    mutationError,
    setMutationError,
    createOrder,
    cancelOrder,
    requestReturn,
    submitDamageClaim,
    retryPayment,
  };
}
