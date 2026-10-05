import { ScrollView, StyleSheet, View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";
import type { FurnitureCategory } from "../types/furniture.types";

interface FurnitureCategoryFilterBarProps {
  selectedCategory: FurnitureCategory | "ALL";
  onSelectCategory: (category: FurnitureCategory | "ALL") => void;
}

const CATEGORIES: Array<{ key: FurnitureCategory | "ALL"; label: string }> = [
  { key: "ALL", label: "All Items" },
  { key: "WORKSTATION", label: "Workstations" },
  { key: "SEATING", label: "Chairs & Seating" },
  { key: "CONFERENCE", label: "Conference" },
  { key: "LOUNGE", label: "Lounge" },
  { key: "STORAGE", label: "Storage" },
  { key: "EXECUTIVE", label: "Executive" },
];

export function FurnitureCategoryFilterBar({
  selectedCategory,
  onSelectCategory,
}: FurnitureCategoryFilterBarProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filter by ${cat.label}`}
              onPress={() => onSelectCategory(cat.key)}
              style={[
                styles.pill,
                isSelected ? styles.pillSelected : styles.pillUnselected,
              ]}
            >
              <Text
                variant="label"
                style={[
                  styles.pillText,
                  isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  pillUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.defaultBorder,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pillTextSelected: {
    color: colors.inverseContent,
  },
  pillTextUnselected: {
    color: colors.secondaryContent,
  },
});
