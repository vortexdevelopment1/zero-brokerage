/**
 * Notification Card Component
 *
 * Visual & Accessibility Requirements:
 * 1. Read vs Unread visual distinction (unread indicator, font weight, background).
 * 2. Non-color-only read state indicators (accessible labels, badge text).
 * 3. Priority indicator without relying only on color.
 * 4. Human-readable timestamp formatting.
 * 5. Touch target accessible and comfortable.
 */

import React from "react";
import { View } from "react-native";
import { Box, Card, Pressable, Stack, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";
import type {
  NotificationCategory,
  NotificationItem,
} from "../types/notifications.types";

interface NotificationCardProps {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
  onMarkRead?: (item: NotificationItem) => void;
  isMarkingRead?: boolean;
}

function getCategoryMeta(category: NotificationCategory): {
  label: string;
  icon: string;
  badgeStyle: { backgroundColor: string; borderColor: string };
} {
  switch (category) {
    case "VISIT_UPDATE":
      return {
        label: "VISIT",
        icon: "📅",
        badgeStyle: {
          backgroundColor: "#FEF3C7",
          borderColor: "#FDE68A",
        },
      };
    case "INQUIRY_UPDATE":
      return {
        label: "INQUIRY",
        icon: "💬",
        badgeStyle: {
          backgroundColor: "#E0F2FE",
          borderColor: "#BAE6FD",
        },
      };
    case "LISTING_UPDATE":
      return {
        label: "LISTING",
        icon: "🏠",
        badgeStyle: {
          backgroundColor: "#F3E8FF",
          borderColor: "#E9D5FF",
        },
      };
    case "ACCOUNT_SECURITY":
      return {
        label: "SECURITY",
        icon: "🔒",
        badgeStyle: {
          backgroundColor: "#FEE2E2",
          borderColor: "#FECACA",
        },
      };
    case "PAYMENT_UPDATE":
      return {
        label: "PAYMENT",
        icon: "💳",
        badgeStyle: {
          backgroundColor: "#ECFDF5",
          borderColor: "#A7F3D0",
        },
      };
    case "SYSTEM_ANNOUNCEMENT":
    default:
      return {
        label: "ANNOUNCEMENT",
        icon: "📢",
        badgeStyle: {
          backgroundColor: "#F1F5F9",
          borderColor: "#E2E8F0",
        },
      };
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const timestamp = new Date(dateString).getTime();
    if (isNaN(timestamp)) return "Recent";

    const diffMinutes = Math.floor((Date.now() - timestamp) / (60 * 1000));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(timestamp).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recent";
  }
}

export function NotificationCard({
  item,
  onPress,
  onMarkRead,
  isMarkingRead,
}: NotificationCardProps) {
  const categoryMeta = getCategoryMeta(item.category);
  const formattedTime = formatRelativeTime(item.createdAt);

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.isRead ? "Read" : "Unread"} ${categoryMeta.label} notification: ${item.title}. ${item.body}. ${formattedTime}`}
      accessibilityHint={item.deepLinkUrl ? "Opens related resource" : "Opens notification detail"}
      className="active:opacity-85"
    >
      <Card
        variant="outlined"
        padding="medium"
        radius="large"
        style={{
          backgroundColor: item.isRead ? "#FFFFFF" : "#F8FAFC",
          borderColor: item.isRead ? colors.subtleBorder : colors.brand.light,
          borderLeftWidth: item.isRead ? 1 : 4,
          borderLeftColor: item.isRead ? colors.subtleBorder : colors.brand.primary,
          marginBottom: 10,
        }}
      >
        <Stack spacing={2}>
          {/* Header Row: Category Badge, Priority, and Timestamp */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-2">
              <View
                style={[
                  {
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    borderWidth: 1,
                  },
                  categoryMeta.badgeStyle,
                ]}
              >
                <Text
                  variant="caption"
                  tone="primary"
                  weight="bold"
                  className="text-[10px]"
                >
                  {categoryMeta.icon} {categoryMeta.label}
                </Text>
              </View>

              {item.priority === "HIGH" && (
                <View className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300">
                  <Text
                    variant="caption"
                    tone="primary"
                    weight="bold"
                    className="text-[9px] text-amber-900"
                  >
                    PRIORITY
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center space-x-2">
              <Text variant="caption" tone="muted" className="text-[11px]">
                {formattedTime}
              </Text>
              {!item.isRead && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.brand.primary,
                  }}
                  accessibilityLabel="Unread indicator"
                />
              )}
            </View>
          </View>

          {/* Title & Body */}
          <Stack spacing={1}>
            <Text
              variant="body"
              tone="primary"
              weight={item.isRead ? "semibold" : "bold"}
              className="text-[15px]"
            >
              {item.title}
            </Text>
            <Text
              variant="bodySmall"
              tone={item.isRead ? "muted" : "secondary"}
              className="text-[13px] leading-5"
            >
              {item.body}
            </Text>
          </Stack>

          {/* Footer Action row if unread or actionable */}
          <View className="flex-row items-center justify-between pt-1">
            <Text variant="caption" tone="brand" weight="semibold">
              {item.deepLinkUrl ? "View Details →" : ""}
            </Text>

            {!item.isRead && onMarkRead && (
              <Pressable
                onPress={() => onMarkRead(item)}
                accessibilityRole="button"
                accessibilityLabel="Mark notification as read"
                className="py-1 px-2 rounded bg-neutral-100 border border-neutral-200 active:bg-neutral-200"
                disabled={isMarkingRead}
              >
                <Text variant="caption" tone="secondary" weight="semibold">
                  {isMarkingRead ? "Updating..." : "Mark as read"}
                </Text>
              </Pressable>
            )}
          </View>
        </Stack>
      </Card>
    </Pressable>
  );
}
