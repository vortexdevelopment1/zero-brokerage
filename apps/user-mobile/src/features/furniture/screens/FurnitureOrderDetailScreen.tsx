/**
 * Furniture Order Detail Screen
 *
 * Blueprint Step 8 Compliance:
 * 1. Complete order breakdown, payment status, delivery tracking, and address.
 * 2. Active rental status, recurring billing renewal dates, and deposit status.
 * 3. Backend-authorized cancellation flow for eligible pending orders.
 * 4. Return request and pickup scheduling for active rentals.
 * 5. Damage claim tracking and reporting flow.
 */

import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Button, Card, Pressable, Text } from "@/components/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback";
import { colors } from "@/theme/tokens";
import { useFurnitureOrderDetail } from "../hooks/useFurnitureOrderDetail";
import { useFurnitureMutations } from "../hooks/useFurnitureMutations";
import {
  FurniturePaymentBadge,
  FurnitureStatusBadge,
  OrderSummaryCard,
} from "../components";
import type { CheckoutSummaryResponse } from "../types/furniture.types";

export function FurnitureOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const { order, isLoading, errorMessage, refetch } = useFurnitureOrderDetail(orderId);
  const {
    isSubmitting,
    mutationError,
    cancelOrder,
    requestReturn,
    submitDamageClaim,
    retryPayment,
  } = useFurnitureMutations();

  // Modals for Actions
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnPickupDate, setReturnPickupDate] = useState("2026-11-01");

  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimDescription, setClaimDescription] = useState("");

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/furniture/orders" as any);
    }
  }

  async function handleConfirmCancel() {
    if (!order) return;
    const res = await cancelOrder(order.id, {
      reason: cancelReason.trim() || "User requested cancellation",
    });
    if (res) {
      setCancelModalVisible(false);
      refetch();
    }
  }

  async function handleConfirmReturn() {
    if (!order) return;
    const res = await requestReturn(order.id, {
      reason: returnReason.trim() || "Rental term ended",
      preferredPickupDate: returnPickupDate,
    });
    if (res) {
      setReturnModalVisible(false);
      refetch();
    }
  }

  async function handleConfirmClaim() {
    if (!order || !claimDescription.trim()) {
      Alert.alert("Description Required", "Please describe the damage or defect.");
      return;
    }
    const res = await submitDamageClaim(order.id, {
      description: claimDescription.trim(),
    });
    if (res) {
      setClaimModalVisible(false);
      setClaimDescription("");
      refetch();
    }
  }

  async function handleRetryPayment() {
    if (!order) return;
    const res = await retryPayment(order.id);
    if (res) {
      refetch();
    }
  }

  const orderSummary: CheckoutSummaryResponse | null = useMemo(() => {
    if (!order) return null;
    return {
      items: order.items,
      oneTimeCharges: order.mode === "SALE" ? order.totalDueNow : 0,
      recurringRentPerPeriod: order.recurringRentPerPeriod,
      rentalFrequency: "MONTHLY",
      securityDeposit: order.securityDeposit,
      deliveryFee: order.deliveryFee,
      taxes: order.taxes,
      totalDueNow: order.totalDueNow,
      futureRecurringAmount: order.recurringRentPerPeriod,
      nextBillingDate: order.nextRenewalDate,
      estimatedDeliveryDays: 3,
      cancellationTerms: "Orders can be cancelled with 100% refund up to 24 hours prior to dispatch.",
      returnTerms: "Rentals are eligible for return after the minimum duration with advance notice.",
      termsConsentRequired: false,
    };
  }, [order]);

  if (isLoading) {
    return (
      <AppContainer style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text variant="title" style={styles.headerTitle}>
            Order Details
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingPadding}>
          <Skeleton width="100%" height={160} borderRadius={12} />
          <View style={{ height: 16 }} />
          <Skeleton width="100%" height={200} borderRadius={12} />
        </View>
      </AppContainer>
    );
  }

  if (errorMessage || !order) {
    return (
      <AppContainer style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text variant="title" style={styles.headerTitle}>
            Order Error
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <ErrorState
          title="Order Not Found"
          message={errorMessage || "The requested order details are not accessible."}
          retryLabel="Try Again"
          onRetry={refetch}
        />
      </AppContainer>
    );
  }

  const isRental = order.mode === "RENTAL" || order.mode === "MIXED";
  const canCancel = order.canCancel;
  const canReturn = order.canRequestReturn && isRental;

  return (
    <AppContainer style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text variant="title" style={styles.headerTitle}>
            {order.orderNumber}
          </Text>
          <Text variant="caption" style={styles.headerSub}>
            Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </View>
        <FurnitureStatusBadge status={order.status} size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Delivery & Tracking Card */}
        <Card style={styles.card} variant="elevated">
          <Text variant="title" style={styles.cardTitle}>
            Delivery & Installation Status
          </Text>
          <View style={styles.deliveryStatusRow}>
            <Text variant="body" style={styles.deliveryStatusText}>
              🚚 {order.deliveryStatus.replace("_", " ")}
            </Text>
            {order.estimatedDeliveryDate ? (
              <Text variant="caption" style={styles.deliveryDateText}>
                Est: {new Date(order.estimatedDeliveryDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </Text>
            ) : null}
          </View>

          {order.trackingNumber ? (
            <Text variant="caption" style={styles.trackingText}>
              Tracking ID: {order.trackingNumber}
            </Text>
          ) : null}

          <View style={styles.divider} />

          <Text variant="caption" style={styles.addressLabel}>
            Destination Address:
          </Text>
          <Text variant="body" style={styles.addressText}>
            {order.deliveryAddress.addressLine1}
            {order.deliveryAddress.addressLine2 ? `, ${order.deliveryAddress.addressLine2}` : ""}
          </Text>
          <Text variant="body" style={styles.addressText}>
            {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
          </Text>
        </Card>

        {/* Active Rental Details Card */}
        {isRental && order.recurringRentPerPeriod > 0 ? (
          <Card style={styles.card} variant="elevated">
            <Text variant="title" style={styles.cardTitle}>
              Active Rental Management
            </Text>
            <View style={styles.rentalRow}>
              <Text variant="caption" style={styles.rentalLabel}>Monthly Recurring Rent:</Text>
              <Text variant="body" style={styles.rentalVal}>
                ₹{order.recurringRentPerPeriod.toLocaleString("en-IN")} /month
              </Text>
            </View>
            {order.nextRenewalDate ? (
              <View style={styles.rentalRow}>
                <Text variant="caption" style={styles.rentalLabel}>Next Billing Date:</Text>
                <Text variant="body" style={styles.rentalVal}>
                  {new Date(order.nextRenewalDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
            ) : null}
            <View style={styles.rentalRow}>
              <Text variant="caption" style={styles.rentalLabel}>Security Deposit Status:</Text>
              <Text variant="body" style={styles.rentalVal}>
                ₹{order.securityDeposit.toLocaleString("en-IN")}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Payment State Section */}
        <Card style={styles.card} variant="elevated">
          <View style={styles.paymentHeaderRow}>
            <View>
              <Text variant="title" style={styles.cardTitle}>
                Payment Information
              </Text>
              <Text variant="caption" style={styles.paymentMethodText}>
                Enterprise Digital Billing
              </Text>
            </View>
            <FurniturePaymentBadge status={order.paymentStatus} size="sm" />
          </View>

          {order.paymentStatus === "ACTION_REQUIRED" ? (
            <View style={styles.paymentNoticeBox}>
              <Text variant="caption" style={styles.paymentNoticeWarning}>
                ⚠️ Action Required: Bank authorization or 3D Secure verification is needed to complete payment.
              </Text>
            </View>
          ) : null}

          {order.paymentStatus === "FAILED" ? (
            <View style={styles.paymentNoticeBox}>
              <Text variant="caption" style={styles.paymentNoticeDanger}>
                ❌ Payment Unsuccessful: The bank declined the charge. Please retry payment to proceed with dispatch.
              </Text>
            </View>
          ) : null}

          {order.paymentStatus === "PENDING" ? (
            <View style={styles.paymentNoticeBox}>
              <Text variant="caption" style={styles.paymentNoticeInfo}>
                ⏳ Payment Pending: Confirmation is in flight with your financial provider.
              </Text>
            </View>
          ) : null}

          {order.paymentStatus === "CANCELLED" ? (
            <View style={styles.paymentNoticeBox}>
              <Text variant="caption" style={styles.paymentNoticeMuted}>
                ℹ️ Payment Cancelled: The transaction session expired or was terminated.
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Authoritative Order Summary Card */}
        {orderSummary ? <OrderSummaryCard summary={orderSummary} /> : null}

        {/* Damage Claims Section */}
        {order.claimStatus && order.claimStatus !== "NONE" ? (
          <Card style={styles.card} variant="elevated">
            <Text variant="title" style={styles.cardTitle}>
              Reported Damage Claims
            </Text>
            <View style={styles.claimItem}>
              <View style={styles.claimHeader}>
                <Text variant="body" style={styles.claimDesc}>
                  {order.claimDescription || "Claim submitted"}
                </Text>
                <Text variant="caption" style={styles.claimStatus}>
                  {order.claimStatus}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {(order.paymentStatus === "FAILED" || order.paymentStatus === "ACTION_REQUIRED") &&
          order.status !== "CANCELLED" &&
          order.status !== "EXPIRED" ? (
            <Button
              label={isSubmitting ? "Retrying Payment..." : "Retry Payment"}
              variant="primary"
              size="medium"
              loading={isSubmitting}
              accessibilityLabel="Retry failed payment"
              onPress={handleRetryPayment}
            />
          ) : null}

          {canCancel ? (
            <Button
              label="Cancel Order"
              variant="destructive"
              size="medium"
              accessibilityLabel="Cancel this order"
              onPress={() => setCancelModalVisible(true)}
            />
          ) : null}

          {canReturn ? (
            <Button
              label="Schedule Return & Pickup"
              variant="secondary"
              size="medium"
              accessibilityLabel="Schedule furniture return pickup"
              onPress={() => setReturnModalVisible(true)}
            />
          ) : null}

          {order.status === "ACTIVE_RENTAL" || order.status === "DELIVERED" ? (
            <Button
              label="Report Damage or Defect"
              variant="secondary"
              size="medium"
              accessibilityLabel="Report damaged furniture or request maintenance"
              onPress={() => setClaimModalVisible(true)}
            />
          ) : null}
        </View>

        {mutationError ? (
          <View style={styles.errorBox}>
            <Text variant="caption" style={styles.errorText}>
              ❌ {mutationError}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Cancel Order Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent} variant="elevated">
            <Text variant="title" style={styles.modalTitle}>
              Cancel Furniture Order
            </Text>
            <Text variant="caption" style={styles.modalSub}>
              Are you sure you want to cancel this order? Any payment made will be refunded within 5-7 business days.
            </Text>
            <TextInput
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChangeText={setCancelReason}
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <Button
                label="Keep Order"
                variant="secondary"
                size="small"
                onPress={() => setCancelModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                label="Confirm Cancel"
                variant="destructive"
                size="small"
                loading={isSubmitting}
                onPress={handleConfirmCancel}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Return Request Modal */}
      <Modal visible={returnModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent} variant="elevated">
            <Text variant="title" style={styles.modalTitle}>
              Schedule Return Pickup
            </Text>
            <Text variant="caption" style={styles.modalSub}>
              Our enterprise logistics team will inspect the assets and process your security deposit refund.
            </Text>
            <TextInput
              placeholder="Preferred pickup date (YYYY-MM-DD)"
              value={returnPickupDate}
              onChangeText={setReturnPickupDate}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Reason for return (e.g. Office relocation)"
              value={returnReason}
              onChangeText={setReturnReason}
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <Button
                label="Close"
                variant="secondary"
                size="small"
                onPress={() => setReturnModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                label="Request Pickup"
                variant="primary"
                size="small"
                loading={isSubmitting}
                onPress={handleConfirmReturn}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Damage Claim Modal */}
      <Modal visible={claimModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent} variant="elevated">
            <Text variant="title" style={styles.modalTitle}>
              Report Damage / Defect
            </Text>
            <Text variant="caption" style={styles.modalSub}>
              Please describe the damage or issue with your furniture asset.
            </Text>
            <TextInput
              placeholder="Detailed description of defect or damage..."
              value={claimDescription}
              onChangeText={setClaimDescription}
              multiline
              numberOfLines={3}
              style={[styles.modalInput, { height: 80 }]}
            />
            <View style={styles.modalBtnRow}>
              <Button
                label="Cancel"
                variant="secondary"
                size="small"
                onPress={() => setClaimModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                label="Submit Claim"
                variant="primary"
                size="small"
                loading={isSubmitting}
                disabled={!claimDescription.trim()}
                onPress={handleConfirmClaim}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </AppContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultBorder,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 28,
    lineHeight: 30,
    color: colors.primaryContent,
    fontWeight: "300",
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryContent,
  },
  headerSub: {
    fontSize: 11,
    color: colors.secondaryContent,
  },
  loadingPadding: {
    padding: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryContent,
    marginBottom: 8,
  },
  deliveryStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deliveryStatusText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.brand.primary,
    textTransform: "capitalize",
  },
  deliveryDateText: {
    fontSize: 12,
    color: colors.secondaryContent,
  },
  trackingText: {
    fontSize: 12,
    color: colors.secondaryContent,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.defaultBorder,
    marginVertical: 10,
  },
  addressLabel: {
    fontSize: 11,
    color: colors.secondaryContent,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    color: colors.primaryContent,
    lineHeight: 18,
  },
  rentalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  rentalLabel: {
    fontSize: 12,
    color: colors.secondaryContent,
  },
  rentalVal: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryContent,
  },
  claimItem: {
    backgroundColor: colors.mutedSurface,
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  claimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  claimDesc: {
    fontSize: 13,
    color: colors.primaryContent,
    flex: 1,
    paddingRight: 8,
  },
  claimStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.warning.text,
  },
  claimDate: {
    fontSize: 10,
    color: colors.mutedContent,
    marginTop: 4,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 10,
  },
  paymentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentMethodText: {
    fontSize: 11,
    color: colors.secondaryContent,
    marginTop: 2,
  },
  paymentNoticeBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.mutedSurface,
  },
  paymentNoticeWarning: {
    fontSize: 12,
    color: colors.warning.text,
    lineHeight: 16,
  },
  paymentNoticeDanger: {
    fontSize: 12,
    color: colors.error.text,
    lineHeight: 16,
  },
  paymentNoticeInfo: {
    fontSize: 12,
    color: colors.brand.primary,
    lineHeight: 16,
  },
  paymentNoticeMuted: {
    fontSize: 12,
    color: colors.secondaryContent,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: colors.error.light,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    color: colors.error.text,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSub: {
    color: colors.secondaryContent,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.defaultBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.primaryContent,
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: "row",
    marginTop: 4,
  },
});
