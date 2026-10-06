/**
 * Payment History Item Row Presentation Component (Step 9A)
 *
 * Strict Compliance:
 * 1. Shows backend-provided transaction status and ledger metadata.
 * 2. NO simulated invoice downloads.
 * 3. Shows refund status clearly when present.
 */

import React from "react";
import { View } from "react-native";
import { Card, Stack, Text } from "@/components/primitives";
import { StatusBadge } from "./StatusBadge";
import {
  mapPaymentStatusToPresentation,
  mapRefundStatusToPresentation,
} from "../utils/status-mappings";
import type { PaymentHistoryItem } from "../types/subscription.types";

interface PaymentHistoryItemRowProps {
  readonly item: PaymentHistoryItem;
}

export function PaymentHistoryItemRow({ item }: PaymentHistoryItemRowProps) {
  const {
    date,
    transactionType,
    productContext,
    displayAmount,
    currency,
    status,
    publicTransactionReference,
    invoiceAvailable,
    refundStatus,
  } = item;

  const statusPresentation = mapPaymentStatusToPresentation(status);
  const refundPresentation =
    refundStatus && refundStatus !== "NONE"
      ? mapRefundStatusToPresentation(refundStatus)
      : null;

  const typeLabels: Record<string, string> = {
    SUBSCRIPTION_PURCHASE: "Membership Activation",
    SUBSCRIPTION_RENEWAL: "Membership Renewal",
    FURNITURE_RENTAL: "Furniture Rental",
    FURNITURE_PURCHASE: "Furniture Purchase",
    OTHER: "Payment",
  };

  return (
    <Card
      variant="outlined"
      padding="medium"
      radius="medium"
      className="border-default-border bg-surface mb-3"
      accessibilityRole="text"
      accessibilityLabel={`Transaction for ${productContext}. Amount: ${
        displayAmount ? `${currency || ""} ${displayAmount}` : "Unavailable"
      }. Status: ${statusPresentation.label}`}
    >
      <Stack spacing={3}>
        {/* Top: Product & Status */}
        <View className="flex-row items-start justify-between">
          <Stack spacing={1} className="flex-1 pr-2">
            <Text
              variant="caption"
              tone="muted"
              weight="bold"
              className="text-[10px] uppercase tracking-wider"
            >
              {typeLabels[transactionType] || transactionType}
            </Text>
            <Text variant="title" tone="primary" weight="bold">
              {productContext}
            </Text>
            <Text variant="caption" tone="secondary">
              {date}
            </Text>
          </Stack>

          <StatusBadge presentation={statusPresentation} size="small" />
        </View>

        {/* Amount & Reference */}
        <View className="flex-row items-center justify-between pt-2 border-t border-subtle-border">
          <View>
            <Text variant="caption" tone="muted" className="text-[10px] uppercase">
              REFERENCE
            </Text>
            <Text variant="caption" tone="secondary" weight="semibold">
              {publicTransactionReference || "REF-CONFIRMING"}
            </Text>
          </View>

          {displayAmount ? (
            <View className="items-end">
              <Text variant="caption" tone="muted" className="text-[10px] uppercase">
                AMOUNT
              </Text>
              <Text variant="title" tone="primary" weight="bold">
                {currency ? `${currency} ` : ""}
                {displayAmount}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Refund Status Notice (if present) */}
        {refundPresentation ? (
          <View className="flex-row items-center justify-between p-2 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
            <Text variant="caption" tone="brand" weight="semibold">
              {refundPresentation.label}
            </Text>
            <Text variant="caption" tone="secondary" className="text-[11px]">
              {refundPresentation.description}
            </Text>
          </View>
        ) : null}

        {/* Invoice Status */}
        <View className="flex-row items-center justify-between pt-1">
          <Text variant="caption" tone="muted" className="text-[11px]">
            {invoiceAvailable
              ? "Tax invoice generated"
              : "Tax invoice generating"}
          </Text>
          <View className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
            <Text
              variant="caption"
              tone="muted"
              className="text-[10px] uppercase font-bold"
            >
              {invoiceAvailable ? "PDF Available" : "Processing"}
            </Text>
          </View>
        </View>
      </Stack>
    </Card>
  );
}
