import { StyleSheet, View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";
import type { FurnitureVariant } from "../types/furniture.types";

interface FurnitureVariantSelectorProps {
  variants: FurnitureVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variant: FurnitureVariant) => void;
}

export function FurnitureVariantSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
}: FurnitureVariantSelectorProps) {
  if (!variants || variants.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="label" style={styles.sectionHeader}>
        Configuration / Color
      </Text>
      <View style={styles.optionsGrid}>
        {variants.map((v) => {
          const isSelected = selectedVariantId === v.id;
          const isAvailable = v.isAvailable;

          return (
            <Pressable
              key={v.id}
              disabled={!isAvailable}
              accessibilityRole="radio"
              accessibilityState={{
                selected: isSelected,
                disabled: !isAvailable,
              }}
              accessibilityLabel={`${v.name}, ${isAvailable ? "In stock" : "Out of stock"}`}
              onPress={() => onSelectVariant(v)}
              style={[
                styles.optionPill,
                isSelected && styles.optionPillSelected,
                !isAvailable && styles.optionPillDisabled,
              ]}
            >
              <View style={styles.optionRow}>
                {v.color ? (
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: v.color },
                      !isAvailable && styles.colorDotDisabled,
                    ]}
                  />
                ) : null}
                <Text
                  variant="body"
                  style={[
                    styles.optionName,
                    isSelected && styles.optionNameSelected,
                    !isAvailable && styles.optionNameDisabled,
                  ]}
                >
                  {v.name}
                </Text>
                {!isAvailable ? (
                  <Text variant="caption" style={styles.outOfStockTag}>
                    (Unavailable)
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryContent,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.defaultBorder,
    backgroundColor: colors.surface,
  },
  optionPillSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.light,
  },
  optionPillDisabled: {
    borderColor: colors.disabled.border,
    backgroundColor: colors.disabled.background,
    opacity: 0.6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  colorDotDisabled: {
    opacity: 0.4,
  },
  optionName: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.primaryContent,
  },
  optionNameSelected: {
    color: colors.brand.primary,
    fontWeight: "700",
  },
  optionNameDisabled: {
    color: colors.disabled.content,
    textDecorationLine: "line-through",
  },
  outOfStockTag: {
    color: colors.error.text,
    fontSize: 11,
    marginLeft: 2,
  },
});
