/**
 * Category Shortcuts Component
 *
 * NOTE ON BACKEND TAXONOMY:
 * The official backend category taxonomy has not yet been registered in `services/api`.
 * These shortcuts are displayed as UI placeholders for exploratory navigation only.
 * They do NOT send unconfirmed enum query parameters to the backend.
 */

import React from "react";
import { ScrollView, View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import type { PropertyCategoryItem } from "../types/discovery.types";

export const PROVISIONAL_CATEGORIES: readonly PropertyCategoryItem[] = [
  { id: "cat-residential", label: "Residential", iconName: "🏡" },
  { id: "cat-commercial", label: "Commercial", iconName: "🏬" },
  { id: "cat-furnished", label: "Furnished", iconName: "🛋" },
];

interface CategoryShortcutsProps {
  categories?: readonly PropertyCategoryItem[];
  selectedCategory?: string;
  onSelectCategory?: (category: PropertyCategoryItem) => void;
}

export function CategoryShortcuts({
  categories = PROVISIONAL_CATEGORIES,
  selectedCategory,
  onSelectCategory,
}: CategoryShortcutsProps) {
  return (
    <View className="py-2.5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={`Category option: ${category.label}`}
              accessibilityHint="Category filtering is pending backend taxonomy finalization"
              onPress={() => onSelectCategory?.(category)}
              className={[
                "flex-row items-center py-2 px-3.5 mr-2.5 rounded-full border active:opacity-80",
                isSelected
                  ? "bg-brand border-brand"
                  : "bg-surface border-default-border",
              ].join(" ")}
            >
              <Text
                variant="caption"
                className="mr-1.5 text-[13px]"
                accessibilityElementsHidden
              >
                {category.iconName}
              </Text>
              <Text
                variant="bodySmall"
                tone={isSelected ? "inverse" : "primary"}
                weight={isSelected ? "bold" : "medium"}
              >
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
