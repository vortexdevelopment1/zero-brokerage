/**
 * Verification Badge Component
 *
 * Disciplinary Boundary:
 * Displays verified indicator ONLY if `status === 'VERIFIED'`.
 * Never calculates verification or trust scores locally.
 */

import React from "react";
import { View } from "react-native";
import { Text } from "@/components/primitives";
import type { ListingVerificationStatus } from "../types/discovery.types";

interface VerificationBadgeProps {
  status?: ListingVerificationStatus;
  variant?: "pill" | "subtle";
}

export function VerificationBadge({
  status,
  variant = "pill",
}: VerificationBadgeProps) {
  if (status !== "VERIFIED") {
    return null;
  }

  if (variant === "subtle") {
    return (
      <View
        accessibilityLabel="Verified Listing"
        accessibilityRole="text"
        className="flex-row items-center px-2 py-0.5 rounded-full bg-success-light border border-success/30"
      >
        <Text
          variant="caption"
          tone="success"
          weight="bold"
          className="text-[10px] tracking-wider uppercase"
        >
          ✓ Verified
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel="Verified Listing"
      accessibilityRole="text"
      className="flex-row items-center px-2.5 py-1 rounded-full bg-success/90 backdrop-blur-md"
    >
      <Text
        variant="caption"
        tone="inverse"
        weight="bold"
        className="text-[10px] tracking-wider uppercase"
      >
        ✓ Verified
      </Text>
    </View>
  );
}
