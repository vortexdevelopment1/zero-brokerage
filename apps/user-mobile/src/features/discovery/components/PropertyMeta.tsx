/**
 * Property Meta Specs Component
 *
 * Renders key property facts (BHK, area in sq.ft, property type)
 * with consistent editorial typography.
 */

import React from "react";
import { View } from "react-native";
import { Text } from "@/components/primitives";
import { formatArea } from "../utils/formatters";

interface PropertyMetaProps {
  bedrooms?: number;
  bathrooms?: number;
  areaSqFt?: number;
  propertyType?: string;
  variant?: "inline" | "pills";
}

export function PropertyMeta({
  bedrooms,
  bathrooms,
  areaSqFt,
  propertyType,
  variant = "inline",
}: PropertyMetaProps) {
  const areaDisplay = formatArea(areaSqFt);

  if (variant === "pills") {
    return (
      <View className="flex-row flex-wrap items-center gap-2">
        {bedrooms ? (
          <View className="px-2.5 py-1 rounded bg-surface-muted border border-subtle-border">
            <Text variant="caption" tone="primary" weight="medium">
              {bedrooms} BHK
            </Text>
          </View>
        ) : null}
        {areaDisplay ? (
          <View className="px-2.5 py-1 rounded bg-surface-muted border border-subtle-border">
            <Text variant="caption" tone="primary" weight="medium">
              {areaDisplay}
            </Text>
          </View>
        ) : null}
        {bathrooms ? (
          <View className="px-2.5 py-1 rounded bg-surface-muted border border-subtle-border">
            <Text variant="caption" tone="primary" weight="medium">
              {bathrooms} Baths
            </Text>
          </View>
        ) : null}
        {propertyType ? (
          <View className="px-2.5 py-1 rounded bg-surface-muted border border-subtle-border">
            <Text variant="caption" tone="primary" weight="medium">
              {propertyType}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const specs: string[] = [];
  if (bedrooms) specs.push(`${bedrooms} BHK`);
  if (areaDisplay) specs.push(areaDisplay);
  if (bathrooms) specs.push(`${bathrooms} Baths`);
  if (propertyType) specs.push(propertyType);

  if (specs.length === 0) return null;

  return (
    <Text
      variant="bodySmall"
      tone="secondary"
      weight="medium"
      numberOfLines={1}
    >
      {specs.join("  •  ")}
    </Text>
  );
}
