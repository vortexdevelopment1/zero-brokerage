/**
 * Property Price Component
 *
 * Formats price cleanly with INR currency symbols, Lakhs/Crores abbreviations,
 * and monthly suffix for rental properties.
 */

import React from "react";
import { View } from "react-native";
import { Text } from "@/components/primitives";
import { formatPrice } from "../utils/formatters";

interface PropertyPriceProps {
  price: number;
  currency?: string;
  intent?: "RENT" | "SALE";
  size?: "normal" | "large" | "hero";
}

export function PropertyPrice({
  price,
  currency = "INR",
  intent = "RENT",
  size = "normal",
}: PropertyPriceProps) {
  const formatted = formatPrice(price, currency);

  if (size === "hero") {
    return (
      <View className="flex-row items-baseline">
        <Text variant="h1" tone="primary" weight="bold">
          {formatted}
        </Text>
        {intent === "RENT" ? (
          <Text variant="body" tone="secondary" className="ml-1">
            / month
          </Text>
        ) : null}
      </View>
    );
  }

  if (size === "large") {
    return (
      <View className="flex-row items-baseline">
        <Text variant="h2" tone="primary" weight="bold">
          {formatted}
        </Text>
        {intent === "RENT" ? (
          <Text variant="bodySmall" tone="secondary" className="ml-1">
            /mo
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-row items-baseline">
      <Text variant="h3" tone="primary" weight="bold">
        {formatted}
      </Text>
      {intent === "RENT" ? (
        <Text variant="bodySmall" tone="secondary" className="ml-1">
          /mo
        </Text>
      ) : null}
    </View>
  );
}
