import { StyleSheet, View } from "react-native";
import { Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";
import type { FurnitureOrderStatus } from "../types/furniture.types";

interface FurnitureStatusBadgeProps {
  status: FurnitureOrderStatus;
  size?: "sm" | "md";
}

interface StatusConfig {
  label: string;
  bg: string;
  fg: string;
  border: string;
}

const STATUS_CONFIGS: Record<FurnitureOrderStatus, StatusConfig> = {
  REQUESTED: {
    label: "Processing",
    bg: colors.warning.light,
    fg: colors.warning.text,
    border: colors.warning.border,
  },
  PAYMENT_PENDING: {
    label: "Payment Pending",
    bg: colors.warning.light,
    fg: colors.warning.text,
    border: colors.warning.border,
  },
  CONFIRMED: {
    label: "Confirmed",
    bg: colors.brand.light,
    fg: colors.brand.primary,
    border: colors.brand.light,
  },
  PREPARING: {
    label: "Preparing",
    bg: colors.brand.light,
    fg: colors.brand.primary,
    border: colors.brand.light,
  },
  DISPATCHED: {
    label: "Dispatched",
    bg: colors.brand.light,
    fg: colors.brand.dark,
    border: colors.brand.light,
  },
  DELIVERED: {
    label: "Delivered",
    bg: colors.success.light,
    fg: colors.success.text,
    border: colors.success.border,
  },
  ACTIVE_RENTAL: {
    label: "Active Rental",
    bg: colors.success.light,
    fg: colors.success.text,
    border: colors.success.border,
  },
  RETURN_REQUESTED: {
    label: "Return Requested",
    bg: colors.warning.light,
    fg: colors.warning.text,
    border: colors.warning.border,
  },
  RETURN_SCHEDULED: {
    label: "Pickup Scheduled",
    bg: "#EDE9FE",
    fg: "#5B21B6",
    border: "#DDD6FE",
  },
  RETURNED: {
    label: "Returned",
    bg: colors.mutedSurface,
    fg: colors.secondaryContent,
    border: colors.defaultBorder,
  },
  CLAIM_UNDER_REVIEW: {
    label: "Claim in Review",
    bg: colors.warning.light,
    fg: colors.warning.text,
    border: colors.warning.border,
  },
  COMPLETED: {
    label: "Completed",
    bg: colors.mutedSurface,
    fg: colors.secondaryContent,
    border: colors.defaultBorder,
  },
  CANCELLED: {
    label: "Cancelled",
    bg: colors.error.light,
    fg: colors.error.text,
    border: colors.error.border,
  },
  REJECTED: {
    label: "Rejected",
    bg: colors.error.light,
    fg: colors.error.text,
    border: colors.error.border,
  },
  FAILED: {
    label: "Failed",
    bg: colors.error.light,
    fg: colors.error.text,
    border: colors.error.border,
  },
  EXPIRED: {
    label: "Expired",
    bg: colors.mutedSurface,
    fg: colors.secondaryContent,
    border: colors.defaultBorder,
  },
};

interface FurniturePaymentBadgeProps {
  status: import("../types/furniture.types").FurniturePaymentStatus;
  size?: "sm" | "md";
}

const PAYMENT_STATUS_CONFIGS: Record<
  import("../types/furniture.types").FurniturePaymentStatus,
  StatusConfig
> = {
  PENDING: {
    label: "Payment Pending",
    bg: colors.warning.light,
    fg: colors.warning.text,
    border: colors.warning.border,
  },
  PROCESSING: {
    label: "Processing Payment",
    bg: colors.brand.light,
    fg: colors.brand.primary,
    border: colors.brand.light,
  },
  COMPLETED: {
    label: "Payment Confirmed",
    bg: colors.success.light,
    fg: colors.success.text,
    border: colors.success.border,
  },
  FAILED: {
    label: "Payment Failed",
    bg: colors.error.light,
    fg: colors.error.text,
    border: colors.error.border,
  },
  CANCELLED: {
    label: "Payment Cancelled",
    bg: colors.mutedSurface,
    fg: colors.secondaryContent,
    border: colors.defaultBorder,
  },
  ACTION_REQUIRED: {
    label: "Action Required",
    bg: colors.warning.light,
    fg: colors.warning.text,
    border: colors.warning.border,
  },
};

export function FurniturePaymentBadge({ status, size = "md" }: FurniturePaymentBadgeProps) {
  const config = PAYMENT_STATUS_CONFIGS[status] || {
    label: status,
    bg: colors.mutedSurface,
    fg: colors.secondaryContent,
    border: colors.defaultBorder,
  };

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Payment status: ${config.label}`}
    >
      <Text
        variant="caption"
        style={[
          styles.text,
          {
            color: config.fg,
            fontSize: isSmall ? 11 : 12,
            fontWeight: "600",
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

export function FurnitureStatusBadge({ status, size = "md" }: FurnitureStatusBadgeProps) {
  const config = STATUS_CONFIGS[status] || {
    label: status,
    bg: colors.mutedSurface,
    fg: colors.secondaryContent,
    border: colors.defaultBorder,
  };

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Order status: ${config.label}`}
    >
      <Text
        variant="caption"
        style={[
          styles.text,
          {
            color: config.fg,
            fontSize: isSmall ? 11 : 12,
            fontWeight: "600",
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    letterSpacing: 0.2,
  },
});
