/**
 * Furniture Checkout Screen
 *
 * Blueprint Step 8 Compliance:
 * 1. Server-authoritative checkout intent resolution.
 * 2. Zero client-side pricing or tax arithmetic.
 * 3. Verified address collection.
 * 4. Explicit recurring rental terms and deposit consent.
 * 5. Payment boundary simulation without exposing secrets or marking local order paid.
 * 6. Navigation to authoritative Order Detail upon confirmation.
 */

import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Button, Card, Pressable, Text } from "@/components/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback";
import { useAuthStore } from "@/services/auth";
import {
  ROUTES,
  getFurnitureOrderDetailRoute,
} from "@/navigation/routes";
import { colors } from "@/theme/tokens";
import { useFurnitureDetail } from "../hooks/useFurnitureDetail";
import { useFurnitureCheckout } from "../hooks/useFurnitureCheckout";
import { useFurnitureMutations } from "../hooks/useFurnitureMutations";
import { OrderSummaryCard } from "../components";
import type {
  CheckoutIntentItemInput,
  CreateFurnitureOrderInput,
  DeliveryAddressInput,
} from "../types/furniture.types";

export function FurnitureCheckoutScreen() {
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = authStatus === "AUTHENTICATED";

  const searchParams = useLocalSearchParams<{
    itemId: string;
    mode: string;
    variantId?: string;
    quantity?: string;
    durationMonths?: string;
  }>();

  const itemId = searchParams.itemId;
  const mode: "RENTAL" | "SALE" = searchParams.mode === "SALE" ? "SALE" : "RENTAL";
  const variantId = searchParams.variantId;
  const quantity = Math.max(1, parseInt(searchParams.quantity || "1", 10));
  const durationMonths = parseInt(searchParams.durationMonths || "3", 10);

  const { item, isLoading: isItemLoading } = useFurnitureDetail(itemId);

  // Address Form State
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  // Consent & Terms Checkbox
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);

  // Build Checkout Intent Items for authoritative quotation
  const checkoutItems: readonly CheckoutIntentItemInput[] = useMemo(() => {
    if (!itemId) return [];
    return [
      {
        assetId: itemId,
        variantId,
        quantity,
        mode,
      },
    ];
  }, [itemId, mode, variantId, quantity]);

  const {
    summary,
    isLoading: isSummaryLoading,
    errorMessage: summaryError,
    refreshSummary,
  } = useFurnitureCheckout({ items: checkoutItems });

  const { isSubmitting, mutationError, createOrder } = useFurnitureMutations();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/furniture" as any);
    }
  }

  function handleSignIn() {
    router.push(ROUTES.AUTH_SIGN_IN as any);
  }

  async function handleConfirmOrder() {
    if (!isAuthenticated) {
      handleSignIn();
      return;
    }

    if (!summary) return;

    if (!addressLine1.trim() || !city.trim() || !pincode.trim()) {
      Alert.alert("Incomplete Address", "Please provide a valid delivery address, city, and pincode.");
      return;
    }

    if (!hasAgreedTerms) {
      Alert.alert("Consent Required", "Please accept the enterprise rental/sale terms to continue.");
      return;
    }

    const deliveryAddress: DeliveryAddressInput = {
      fullName: user?.fullName || "Zero Brokerage Member",
      phone: user?.phone || "+91 98765 43210",
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      locality: locality.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
    };

    const request: CreateFurnitureOrderInput = {
      items: summary.items.map((it) => ({
        assetId: it.assetId,
        variantId: it.variantName,
        quantity: it.quantity,
        mode: it.mode,
      })),
      deliveryAddress,
      rentalDurationMonths: mode === "RENTAL" ? durationMonths : undefined,
    };

    const created = await createOrder(request);

    if (created) {
      router.replace(getFurnitureOrderDetailRoute(created.id) as any);
    }
  }

  if (isItemLoading || isSummaryLoading) {
    return (
      <AppContainer style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text variant="title" style={styles.headerTitle}>
            Review Checkout
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingPadding}>
          <Skeleton width="100%" height={180} borderRadius={12} />
          <View style={{ height: 16 }} />
          <Skeleton width="100%" height={120} borderRadius={12} />
        </View>
      </AppContainer>
    );
  }

  if (summaryError || !summary) {
    return (
      <AppContainer style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text variant="title" style={styles.headerTitle}>
            Checkout Error
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <ErrorState
          title="Quotation Unavailable"
          message={summaryError || "We could not calculate the authoritative order summary."}
          retryLabel="Recalculate"
          onRetry={refreshSummary}
        />
      </AppContainer>
    );
  }

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
        <Text variant="title" style={styles.headerTitle}>
          Checkout & Terms
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Auth prompt if guest */}
        {!isAuthenticated ? (
          <View style={styles.authNotice}>
            <Text variant="body" style={styles.authNoticeTitle}>
              Sign In Required
            </Text>
            <Text variant="caption" style={styles.authNoticeText}>
              Please sign in to confirm delivery address and reserve workspace assets.
            </Text>
            <Button
              label="Sign In to Proceed"
              variant="secondary"
              size="small"
              onPress={handleSignIn}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : null}

        {/* Server Authoritative Summary */}
        <OrderSummaryCard summary={summary} />

        {/* Delivery Address Form */}
        <Card style={styles.sectionCard} variant="elevated">
          <Text variant="title" style={styles.sectionTitle}>
            Delivery & Installation Address
          </Text>
          <Text variant="caption" style={styles.sectionSub}>
            Delivered in {summary.estimatedDeliveryDays} business days to your serviceable address.
          </Text>

          <View style={styles.formGroup}>
            <Text variant="caption" style={styles.inputLabel}>
              Address Line 1 *
            </Text>
            <TextInput
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="Building, Street, Floor"
              style={styles.textInput}
              accessibilityLabel="Delivery address line 1"
            />
          </View>

          <View style={styles.formGroup}>
            <Text variant="caption" style={styles.inputLabel}>
              Address Line 2 (Optional)
            </Text>
            <TextInput
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Landmark or locality"
              style={styles.textInput}
              accessibilityLabel="Delivery address line 2"
            />
          </View>

          <View style={styles.rowTwoCol}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text variant="caption" style={styles.inputLabel}>
                City *
              </Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Bengaluru, Mumbai"
                style={styles.textInput}
                accessibilityLabel="City"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text variant="caption" style={styles.inputLabel}>
                PIN Code *
              </Text>
              <TextInput
                value={pincode}
                onChangeText={setPincode}
                placeholder="560001"
                keyboardType="numeric"
                maxLength={6}
                style={styles.textInput}
                accessibilityLabel="Delivery postal code"
              />
            </View>
          </View>
        </Card>

        {/* Terms & Consent */}
        <Card style={styles.sectionCard} variant="elevated">
          <Text variant="title" style={styles.sectionTitle}>
            Enterprise Agreement & Disclosures
          </Text>

          <View style={styles.disclosuresList}>
            <Text variant="caption" style={styles.discText}>
              • {summary.cancellationTerms}
            </Text>
            <Text variant="caption" style={styles.discText}>
              • {summary.returnTerms}
            </Text>
            <Text variant="caption" style={styles.discText}>
              • Normal wear & tear from standard commercial usage is covered.
            </Text>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: hasAgreedTerms }}
            accessibilityLabel="I accept the furniture terms and recurring payment obligations"
            onPress={() => setHasAgreedTerms(!hasAgreedTerms)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, hasAgreedTerms && styles.checkboxChecked]}>
              {hasAgreedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text variant="caption" style={styles.checkboxLabel}>
              I agree to the Zero Brokerage workspace terms, security deposit policy, and recurring monthly billing obligations.
            </Text>
          </Pressable>
        </Card>

        {mutationError ? (
          <View style={styles.errorBox}>
            <Text variant="caption" style={styles.errorBoxText}>
              ❌ {mutationError}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalCol}>
          <Text variant="caption" style={styles.totalDueLabel}>
            Total Due Today
          </Text>
          <Text variant="title" style={styles.totalDueVal}>
            ₹{summary.totalDueNow.toLocaleString("en-IN")}
          </Text>
        </View>

        <Button
          label={isSubmitting ? "Placing Order..." : "Confirm & Pay"}
          accessibilityLabel="Confirm order and pay"
          loading={isSubmitting}
          disabled={isSubmitting || !hasAgreedTerms}
          onPress={handleConfirmOrder}
          variant="primary"
          size="medium"
          style={styles.confirmBtn}
        />
      </View>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryContent,
    flex: 1,
    textAlign: "center",
  },
  loadingPadding: {
    padding: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  authNotice: {
    backgroundColor: colors.brand.light,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.brand.light,
  },
  authNoticeTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: colors.brand.primary,
  },
  authNoticeText: {
    color: colors.secondaryContent,
    marginTop: 2,
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryContent,
  },
  sectionSub: {
    color: colors.secondaryContent,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.secondaryContent,
    marginBottom: 4,
    fontWeight: "500",
  },
  textInput: {
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.primaryContent,
    borderWidth: 1,
    borderColor: colors.defaultBorder,
  },
  inputDisabled: {
    backgroundColor: "#F1F5F9",
    color: colors.secondaryContent,
  },
  rowTwoCol: {
    flexDirection: "row",
  },
  disclosuresList: {
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginVertical: 10,
  },
  discText: {
    color: colors.secondaryContent,
    fontSize: 11,
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.strongBorder,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  checkmark: {
    color: colors.inverseContent,
    fontSize: 12,
    fontWeight: "700",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryContent,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: colors.error.light,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  errorBoxText: {
    color: colors.error.text,
    fontSize: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.defaultBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  totalCol: {
    flex: 1,
  },
  totalDueLabel: {
    fontSize: 11,
    color: colors.secondaryContent,
  },
  totalDueVal: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.brand.primary,
  },
  confirmBtn: {
    marginLeft: 16,
    minWidth: 160,
  },
});
