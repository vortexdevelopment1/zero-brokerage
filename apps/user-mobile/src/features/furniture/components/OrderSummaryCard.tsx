import { StyleSheet, View } from "react-native";
import { Card, Text } from "@/components/primitives";
import { colors } from "@/theme/tokens";
import type { CheckoutSummaryResponse } from "../types/furniture.types";

interface OrderSummaryCardProps {
  summary: CheckoutSummaryResponse;
  showHeader?: boolean;
}

export function OrderSummaryCard({ summary, showHeader = true }: OrderSummaryCardProps) {
  const isRental = summary.recurringRentPerPeriod > 0;

  return (
    <Card style={styles.card} variant="elevated">
      {showHeader ? (
        <View style={styles.header}>
          <Text variant="title" style={styles.headerTitle}>
            Payment & Order Summary
          </Text>
          <Text variant="caption" style={styles.headerSub}>
            Authoritative Server Quotation
          </Text>
        </View>
      ) : null}

      {/* Item Line Items */}
      <View style={styles.itemsSection}>
        {summary.items.map((item) => (
          <View key={`${item.assetId}-${item.variantName || "default"}`} style={styles.itemRow}>
            <View style={styles.itemDetails}>
              <Text variant="body" numberOfLines={1} style={styles.itemName}>
                {item.assetName}
              </Text>
              <Text variant="caption" style={styles.itemMeta}>
                Qty: {item.quantity} {item.variantName ? `• ${item.variantName}` : ""}
              </Text>
            </View>
            <Text variant="body" style={styles.itemPrice}>
              ₹{item.subtotal.toLocaleString("en-IN")}
              {item.mode === "RENTAL" ? " /mo" : ""}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* Fee Breakdown */}
      <View style={styles.breakdownSection}>
        {isRental ? (
          <View style={styles.feeRow}>
            <Text variant="body" style={styles.feeLabel}>
              First Month Rent
            </Text>
            <Text variant="body" style={styles.feeValue}>
              ₹{summary.recurringRentPerPeriod.toLocaleString("en-IN")}
            </Text>
          </View>
        ) : null}

        {summary.oneTimeCharges > 0 ? (
          <View style={styles.feeRow}>
            <Text variant="body" style={styles.feeLabel}>
              Direct Purchase Subtotal
            </Text>
            <Text variant="body" style={styles.feeValue}>
              ₹{summary.oneTimeCharges.toLocaleString("en-IN")}
            </Text>
          </View>
        ) : null}

        {summary.securityDeposit > 0 ? (
          <View style={styles.feeRow}>
            <View>
              <Text variant="body" style={styles.feeLabel}>
                Security Deposit
              </Text>
              <Text variant="caption" style={styles.feeSub}>
                100% Refundable on return inspection
              </Text>
            </View>
            <Text variant="body" style={styles.feeValue}>
              ₹{summary.securityDeposit.toLocaleString("en-IN")}
            </Text>
          </View>
        ) : null}

        <View style={styles.feeRow}>
          <View>
            <Text variant="body" style={styles.feeLabel}>
              Delivery & White-Glove Setup
            </Text>
            <Text variant="caption" style={styles.feeSub}>
              Includes professional installation & cleanup
            </Text>
          </View>
          <Text variant="body" style={styles.feeValue}>
            {summary.deliveryFee === 0 ? "FREE" : `₹${summary.deliveryFee.toLocaleString("en-IN")}`}
          </Text>
        </View>

        {summary.taxes > 0 ? (
          <View style={styles.feeRow}>
            <Text variant="body" style={styles.feeLabel}>
              Estimated Taxes (GST)
            </Text>
            <Text variant="body" style={styles.feeValue}>
              ₹{summary.taxes.toLocaleString("en-IN")}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* Due Today */}
      <View style={styles.totalRow}>
        <View>
          <Text variant="title" style={styles.totalLabel}>
            Total Due Today
          </Text>
          <Text variant="caption" style={styles.totalSub}>
            All taxes & deposit included
          </Text>
        </View>
        <Text variant="title" style={styles.totalAmount}>
          ₹{summary.totalDueNow.toLocaleString("en-IN")}
        </Text>
      </View>

      {/* Recurring Rental Information */}
      {isRental && summary.futureRecurringAmount > 0 ? (
        <View style={styles.recurringBox}>
          <View style={styles.recurringRow}>
            <Text variant="body" style={styles.recurringLabel}>
              Next Recurring Rent:
            </Text>
            <Text variant="body" style={styles.recurringAmount}>
              ₹{summary.futureRecurringAmount.toLocaleString("en-IN")} /month
            </Text>
          </View>
          {summary.nextBillingDate ? (
            <Text variant="caption" style={styles.recurringDate}>
              Billed monthly on {new Date(summary.nextBillingDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          ) : null}
          <Text variant="caption" style={styles.recurringNote}>
            {summary.returnTerms}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryContent,
  },
  headerSub: {
    color: colors.secondaryContent,
    marginTop: 2,
    fontSize: 12,
  },
  itemsSection: {
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryContent,
  },
  itemMeta: {
    color: colors.secondaryContent,
    fontSize: 12,
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryContent,
  },
  divider: {
    height: 1,
    backgroundColor: colors.defaultBorder,
    marginVertical: 12,
  },
  breakdownSection: {
    gap: 10,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  feeLabel: {
    fontSize: 13,
    color: colors.secondaryContent,
  },
  feeSub: {
    fontSize: 11,
    color: colors.mutedContent,
    marginTop: 1,
  },
  feeValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryContent,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryContent,
  },
  totalSub: {
    fontSize: 11,
    color: colors.secondaryContent,
    marginTop: 1,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.brand.primary,
  },
  recurringBox: {
    marginTop: 14,
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.defaultBorder,
  },
  recurringRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recurringLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryContent,
  },
  recurringAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brand.primary,
  },
  recurringDate: {
    fontSize: 11,
    color: colors.secondaryContent,
    marginTop: 4,
  },
  recurringNote: {
    fontSize: 11,
    color: colors.mutedContent,
    marginTop: 2,
  },
});
