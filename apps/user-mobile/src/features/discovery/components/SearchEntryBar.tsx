/**
 * Search Entry Bar Component
 *
 * Refined search input object with focus transitions, clear control,
 * and filter trigger.
 */

import React, { useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";

interface SearchEntryBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  onFilterPress?: () => void;
  activeFilterCount?: number;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchEntryBar({
  value,
  onChangeText,
  onSubmitEditing,
  onFilterPress,
  activeFilterCount = 0,
  placeholder = "Search by locality, architecture, or bedrooms...",
  isLoading = false,
}: SearchEntryBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="px-5 py-3 bg-surface">
      <View className="flex-row items-center space-x-2">
        {/* Search Input Container */}
        <View
          className={[
            "flex-1 flex-row items-center h-12 px-3.5 rounded-large bg-surface-muted border transition-all",
            isFocused
              ? "border-brand bg-surface shadow-sm"
              : "border-default-border",
          ].join(" ")}
        >
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.brand.primary}
              style={{ marginRight: 8 }}
            />
          ) : (
            <Text
              variant="body"
              tone={isFocused ? "brand" : "muted"}
              className="mr-2.5 text-[15px]"
              accessibilityElementsHidden
            >
              🔍
            </Text>
          )}

          <TextInput
            accessibilityRole="search"
            accessibilityLabel="Search properties"
            accessibilityHint="Type to search for apartments, penthouses, or localities"
            className="flex-1 text-[14px] text-primary-content py-0"
            placeholder={placeholder}
            placeholderTextColor={colors.secondaryContent}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitEditing}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="never"
          />

          {value.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search query"
              onPress={() => onChangeText("")}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-6 h-6 items-center justify-center rounded-full bg-neutral-200 active:bg-neutral-300"
            >
              <Text
                variant="caption"
                tone="primary"
                className="text-[11px] font-bold"
              >
                ✕
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Filter Action Trigger */}
        {onFilterPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              activeFilterCount > 0
                ? `Filter options, ${activeFilterCount} active filters`
                : "Filter options"
            }
            accessibilityHint="Opens search filter sheet"
            onPress={onFilterPress}
            className={[
              "w-12 h-12 rounded-large items-center justify-center border active:opacity-80 ml-2",
              activeFilterCount > 0
                ? "bg-brand-light border-brand"
                : "bg-surface-muted border-default-border",
            ].join(" ")}
          >
            <Text
              variant="body"
              tone={activeFilterCount > 0 ? "brand" : "primary"}
              className="text-[15px]"
            >
              ⚙
            </Text>
            {activeFilterCount > 0 ? (
              <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand" />
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
