import { StyleSheet, View } from "react-native";
import { Pressable, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";
export type FurnitureMode = "RENTAL" | "SALE";

interface RentalSaleToggleProps {
  mode: FurnitureMode;
  onModeChange: (newMode: FurnitureMode) => void;
  rentalSupported?: boolean;
  saleSupported?: boolean;
  rentalStartingPrice?: string;
  saleStartingPrice?: string;
}

export function RentalSaleToggle({
  mode,
  onModeChange,
  rentalSupported = true,
  saleSupported = true,
  rentalStartingPrice,
  saleStartingPrice,
}: RentalSaleToggleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.toggleTrack}>
        {rentalSupported && (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "RENTAL" }}
            accessibilityLabel={`Rental option, ${rentalStartingPrice ? `starts at ${rentalStartingPrice} per month` : ""}`}
            onPress={() => onModeChange("RENTAL")}
            style={[
              styles.tab,
              mode === "RENTAL" && styles.tabActive,
            ]}
          >
            <Text
              variant="label"
              style={[
                styles.tabTitle,
                mode === "RENTAL" ? styles.tabTitleActive : styles.tabTitleInactive,
              ]}
            >
              Rent Monthly
            </Text>
            {rentalStartingPrice ? (
              <Text
                variant="caption"
                style={[
                  styles.tabSub,
                  mode === "RENTAL" ? styles.tabSubActive : styles.tabSubInactive,
                ]}
              >
                {rentalStartingPrice}/mo
              </Text>
            ) : null}
          </Pressable>
        )}

        {saleSupported && (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "SALE" }}
            accessibilityLabel={`Purchase option, ${saleStartingPrice ? `one-time price ${saleStartingPrice}` : ""}`}
            onPress={() => onModeChange("SALE")}
            style={[
              styles.tab,
              mode === "SALE" && styles.tabActive,
            ]}
          >
            <Text
              variant="label"
              style={[
                styles.tabTitle,
                mode === "SALE" ? styles.tabTitleActive : styles.tabTitleInactive,
              ]}
            >
              Buy Outright
            </Text>
            {saleStartingPrice ? (
              <Text
                variant="caption"
                style={[
                  styles.tabSub,
                  mode === "SALE" ? styles.tabSubActive : styles.tabSubInactive,
                ]}
              >
                {saleStartingPrice}
              </Text>
            ) : null}
          </Pressable>
        )}
      </View>

      <View style={styles.disclosureRow}>
        <Text variant="caption" style={styles.disclosureText}>
          {mode === "RENTAL"
            ? "• Recurring billing • Security deposit applicable • Zero maintenance cost"
            : "• One-time payment • Full commercial ownership • 3-Year Enterprise Warranty"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  toggleTrack: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.defaultBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabTitle: {
    fontWeight: "600",
    fontSize: 13,
  },
  tabTitleActive: {
    color: colors.brand.primary,
  },
  tabTitleInactive: {
    color: colors.secondaryContent,
  },
  tabSub: {
    fontSize: 11,
    marginTop: 2,
  },
  tabSubActive: {
    color: colors.primaryContent,
    fontWeight: "500",
  },
  tabSubInactive: {
    color: colors.mutedContent,
  },
  disclosureRow: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  disclosureText: {
    color: colors.secondaryContent,
    fontSize: 11,
    lineHeight: 16,
  },
});
