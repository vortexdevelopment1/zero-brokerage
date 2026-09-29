/**
 * Search Entry Bar Component
 *
 * Search input field and filter trigger action.
 */

import React from "react";
import { TextInput, View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";

interface SearchEntryBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  onFilterPress?: () => void;
  activeFilterCount?: number;
  placeholder?: string;
}

export function SearchEntryBar({
  value,
  onChangeText,
  onSubmitEditing,
  onFilterPress,
  activeFilterCount = 0,
  placeholder = "Search localities, projects, or bedrooms...",
}: SearchEntryBarProps) {
  return (
    <View className="px-5 py-2.5 bg-surface">
      <View className="flex-row items-center space-x-2">
        {/* Search Input Container */}
        <View className="flex-1 flex-row items-center h-12 px-3.5 rounded-large bg-surface-muted border border-default-border focus:border-brand">
          <Text
            variant="body"
            tone="muted"
            className="mr-2 text-[15px]"
            accessibilityElementsHidden
          >
            🔍
          </Text>
          <TextInput
            accessibilityRole="search"
            accessibilityLabel="Search properties"
            accessibilityHint="Type to search for apartments, villas, or localities"
            className="flex-1 text-[15px] text-content-primary py-0"
            placeholder={placeholder}
            placeholderTextColor={colors.secondaryContent}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitEditing}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {value.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              onPress={() => onChangeText("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="p-1"
            >
              <Text
                variant="caption"
                tone="muted"
                className="text-[12px] font-bold"
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
            className="w-12 h-12 rounded-large items-center justify-center bg-surface-muted border border-default-border active:bg-surface-elevated ml-2"
          >
            <Text
              variant="body"
              tone={activeFilterCount > 0 ? "brand" : "primary"}
              className="text-[15px]"
            >
              ⚙
            </Text>
            {activeFilterCount > 0 ? (
              <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
