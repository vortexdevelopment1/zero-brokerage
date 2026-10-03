/**
 * Favorite Button Component
 *
 * Micro-interaction for bookmarking listings.
 * Provides accessible labels and tactile visual feedback.
 */

import React from "react";
import { View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import { useFavoritesStore } from "../stores/favorites-store";
import { trackEvent } from "@/services/analytics/analytics";
import { colors } from "@/theme/tokens";

interface FavoriteButtonProps {
  listingId: string;
  variant?: "floating" | "surface";
  size?: "small" | "medium";
}

export function FavoriteButton({
  listingId,
  variant = "floating",
  size = "medium",
}: FavoriteButtonProps) {
  const isFav = useFavoritesStore((state) => state.isFavorite(listingId));
  const toggle = useFavoritesStore((state) => state.toggleFavorite);

  function handlePress() {
    toggle(listingId);
  }

  const isSmall = size === "small";
  const btnSize = isSmall ? "w-8 h-8" : "w-10 h-10";
  const heartSize = isSmall ? 15 : 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isFav ? "Remove from saved properties" : "Save property to favorites"
      }
      accessibilityState={{ selected: isFav }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={handlePress}
      className={[
        btnSize,
        "items-center justify-center rounded-full active:scale-95",
        variant === "floating"
          ? "bg-black/40 backdrop-blur-md border border-white/20"
          : "bg-surface-muted border border-default-border",
      ].join(" ")}
    >
      <View className="items-center justify-center">
        <Text
          variant="body"
          style={{
            color: isFav
              ? colors.error.DEFAULT
              : variant === "floating"
                ? "#FFFFFF"
                : colors.secondaryContent,
            fontSize: heartSize,
            lineHeight: heartSize + 2,
          }}
          accessibilityElementsHidden
        >
          {isFav ? "♥" : "♡"}
        </Text>
      </View>
    </Pressable>
  );
}
