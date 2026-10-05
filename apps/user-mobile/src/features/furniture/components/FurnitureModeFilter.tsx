import { StyleSheet, View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";

export type FurnitureDisplayMode = "ALL" | "RENTAL" | "SALE" | "PACKAGE";

interface FurnitureModeFilterProps {
  selectedMode: FurnitureDisplayMode;
  onSelectMode: (mode: FurnitureDisplayMode) => void;
}

const MODES: Array<{ key: FurnitureDisplayMode; label: string }> = [
  { key: "ALL", label: "All Offerings" },
  { key: "RENTAL", label: "Rentals" },
  { key: "SALE", label: "Purchase" },
  { key: "PACKAGE", label: "Turnkey Packages" },
];

export function FurnitureModeFilter({
  selectedMode,
  onSelectMode,
}: FurnitureModeFilterProps) {
  return (
    <View style={styles.container}>
      {MODES.map((m) => {
        const isSelected = selectedMode === m.key;
        return (
          <Pressable
            key={m.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`View ${m.label}`}
            onPress={() => onSelectMode(m.key)}
            style={[
              styles.tab,
              isSelected ? styles.tabSelected : styles.tabUnselected,
            ]}
          >
            <Text
              variant="label"
              style={[
                styles.tabText,
                isSelected ? styles.tabTextSelected : styles.tabTextUnselected,
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  tabSelected: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  tabUnselected: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabTextSelected: {
    color: colors.brand.primary,
  },
  tabTextUnselected: {
    color: colors.secondaryContent,
  },
});
