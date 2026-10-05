import { Image, StyleSheet, View } from "react-native";
import { Card, Pressable, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";
import type { FurnitureAsset } from "../types/furniture.types";

interface FurnitureCardProps {
  item: FurnitureAsset;
  onPress: (item: FurnitureAsset) => void;
  selectedMode?: "ALL" | "RENTAL" | "SALE" | "PACKAGE";
}

export function FurnitureCard({ item, onPress, selectedMode = "ALL" }: FurnitureCardProps) {
  const isPackage = item.type === "PACKAGE";
  const isOutOfStock = item.availability === "OUT_OF_STOCK" || item.availability === "UNAVAILABLE";
  const isLowStock = !isOutOfStock && item.availableQuantity <= 5;

  const showRent = (selectedMode === "RENTAL" || selectedMode === "ALL" || selectedMode === "PACKAGE") && !!item.rentPerPeriod;
  const showSale = (selectedMode === "SALE" || !item.rentPerPeriod) && !!item.salePrice;

  return (
    <Card style={styles.card} variant="elevated">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${isPackage ? "Turnkey Office Package" : item.category}, ${showRent && item.rentPerPeriod ? `Rent ₹${item.rentPerPeriod.toLocaleString("en-IN")} per month` : ""}, ${showSale && item.salePrice ? `Buy outright ₹${item.salePrice.toLocaleString("en-IN")}` : ""}`}
        onPress={() => onPress(item)}
        style={styles.pressable}
      >
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.image}
              resizeMode="cover"
              accessibilityLabel={`${item.name} image`}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text variant="caption" style={styles.imagePlaceholderText}>
                Zero Brokerage Workspace
              </Text>
            </View>
          )}

          {/* Badges on image */}
          <View style={styles.badgeRow}>
            {isPackage ? (
              <View style={styles.packageBadge}>
                <Text style={styles.packageBadgeText}>
                  {item.packageCapacity
                    ? `${item.packageCapacity}-Desk Package`
                    : "Office Package"}
                </Text>
              </View>
            ) : (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
            )}

            {isOutOfStock ? (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.stockBadgeText}>Out of stock</Text>
              </View>
            ) : isLowStock ? (
              <View style={styles.lowStockBadge}>
                <Text style={styles.stockBadgeText}>Only {item.availableQuantity} left</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          <Text variant="body" numberOfLines={1} style={styles.title}>
            {item.name}
          </Text>

          {isPackage && item.packageIncludedItems ? (
            <Text variant="caption" numberOfLines={1} style={styles.packageSub}>
              Includes {item.packageIncludedItems.length} curated asset types
            </Text>
          ) : item.materials ? (
            <Text variant="caption" numberOfLines={1} style={styles.packageSub}>
              {item.materials.join(" • ")}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            {showRent && item.rentPerPeriod ? (
              <View>
                <View style={styles.amountLine}>
                  <Text variant="body" style={styles.rentAmount}>
                    ₹{item.rentPerPeriod.toLocaleString("en-IN")}
                  </Text>
                  <Text variant="caption" style={styles.rentUnit}>
                    /mo
                  </Text>
                </View>
                {item.depositAmount ? (
                  <Text variant="caption" style={styles.depositLabel}>
                    ₹{item.depositAmount.toLocaleString("en-IN")} deposit
                  </Text>
                ) : null}
              </View>
            ) : null}

            {showSale && item.salePrice ? (
              <View style={showRent && item.rentPerPeriod ? styles.saleColWithRent : undefined}>
                <View style={styles.amountLine}>
                  <Text variant="body" style={styles.saleAmount}>
                    ₹{item.salePrice.toLocaleString("en-IN")}
                  </Text>
                </View>
                <Text variant="caption" style={styles.depositLabel}>
                  One-time buy
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <Text variant="caption" style={styles.deliveryText} numberOfLines={1}>
              ⚡ {item.deliveryEstimateDays} business days delivery
            </Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 6,
    backgroundColor: colors.surface,
  },
  pressable: {
    width: "100%",
  },
  imageContainer: {
    height: 160,
    width: "100%",
    backgroundColor: colors.mutedSurface,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  imagePlaceholderText: {
    color: colors.secondaryContent,
    fontWeight: "500",
  },
  badgeRow: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageBadge: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  packageBadgeText: {
    color: colors.inverseContent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  categoryBadge: {
    backgroundColor: "rgba(9, 9, 11, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: colors.inverseContent,
    fontSize: 11,
    fontWeight: "500",
  },
  outOfStockBadge: {
    backgroundColor: colors.error.DEFAULT,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  lowStockBadge: {
    backgroundColor: colors.warning.DEFAULT,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockBadgeText: {
    color: colors.inverseContent,
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    padding: 12,
  },
  title: {
    fontWeight: "700",
    fontSize: 15,
    color: colors.primaryContent,
  },
  packageSub: {
    color: colors.secondaryContent,
    marginTop: 2,
    fontSize: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 10,
    justifyContent: "space-between",
  },
  amountLine: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  rentAmount: {
    fontWeight: "700",
    fontSize: 17,
    color: colors.brand.primary,
  },
  rentUnit: {
    fontSize: 12,
    color: colors.secondaryContent,
    marginLeft: 2,
  },
  saleColWithRent: {
    alignItems: "flex-end",
  },
  saleAmount: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.primaryContent,
  },
  depositLabel: {
    color: colors.mutedContent,
    fontSize: 11,
    marginTop: 1,
  },
  footerRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.subtleBorder,
  },
  deliveryText: {
    color: colors.secondaryContent,
    fontSize: 11,
    fontWeight: "500",
  },
});
