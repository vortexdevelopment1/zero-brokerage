/**
 * Furniture Detail Screen
 *
 * Blueprint Step 8 Compliance:
 * 1. Comprehensive view of individual furniture assets or turnkey packaged setups.
 * 2. Visual gallery and complete enterprise specifications.
 * 3. Transparent Rental vs Purchase mode selection with disclosed terms.
 * 4. Variant selection with stock status enforcement.
 * 5. Quantity selector adhering to availability limits.
 * 6. Direct entry into Checkout Intent flow.
 */

import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Button, Card, Pressable, Text } from "@/components/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback";
import {
  ROUTES,
  getFurnitureCheckoutRoute,
} from "@/navigation/routes";
import { colors } from "@/theme/tokens";
import { useFurnitureDetail } from "../hooks/useFurnitureDetail";
import {
  FurnitureVariantSelector,
  RentalSaleToggle,
} from "../components";
import type {
  FurnitureCommercialMode,
  FurnitureVariant,
} from "../types/furniture.types";

export function FurnitureDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const furnitureId = params.id;

  const { item, isLoading, errorMessage, refetch } = useFurnitureDetail(furnitureId);

  // User selection state
  const [selectedMode, setSelectedMode] = useState<"RENTAL" | "SALE">("RENTAL");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Set default variant when item loads
  const currentVariant: FurnitureVariant | undefined = useMemo(() => {
    if (!item?.variants || item.variants.length === 0) return undefined;
    if (selectedVariantId) {
      return item.variants.find((v) => v.id === selectedVariantId) || item.variants[0];
    }
    return item.variants.find((v) => v.isAvailable) || item.variants[0];
  }, [item, selectedVariantId]);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/furniture" as any);
    }
  }

  function handleQuantityChange(delta: number) {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      const max = item?.availableQuantity ?? 99;
      if (next > max) return max;
      return next;
    });
  }

  function handleProceedToCheckout() {
    if (!item) return;

    const checkoutUrl = getFurnitureCheckoutRoute({
      itemId: item.id,
      mode: selectedMode,
      variantId: currentVariant?.id,
      quantity,
      durationMonths: item.minRentalMonths ?? 3,
    });

    router.push(checkoutUrl as any);
  }

  if (isLoading) {
    return (
      <AppContainer style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text variant="title" style={styles.headerTitle}>
            Loading Details...
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingPadding}>
          <Skeleton width="100%" height={240} borderRadius={12} />
          <View style={{ height: 16 }} />
          <Skeleton width="80%" height={26} borderRadius={4} />
          <View style={{ height: 10 }} />
          <Skeleton width="40%" height={20} borderRadius={4} />
          <View style={{ height: 20 }} />
          <Skeleton width="100%" height={100} borderRadius={12} />
        </View>
      </AppContainer>
    );
  }

  if (errorMessage || !item) {
    return (
      <AppContainer style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text variant="title" style={styles.headerTitle}>
            Furniture Detail
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <ErrorState
          title="Item Not Found"
          message={errorMessage || "The requested furniture asset is no longer available in the catalog."}
          retryLabel="Try Again"
          onRetry={refetch}
        />
      </AppContainer>
    );
  }

  const isPackage = item.type === "PACKAGE";
  const isOutOfStock = item.availability === "OUT_OF_STOCK" || item.availability === "UNAVAILABLE";
  const hasRental = item.availableModes.includes("RENTAL");
  const hasSale = item.availableModes.includes("SALE");

  // Backend-provided unit pricing from catalog
  const formattedRent = item.rentPerPeriod
    ? `₹${item.rentPerPeriod.toLocaleString("en-IN")}/mo`
    : "";
  const formattedSale = item.salePrice
    ? `₹${item.salePrice.toLocaleString("en-IN")}`
    : "";

  return (
    <AppContainer style={styles.container}>
      {/* Top App Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text variant="title" numberOfLines={1} style={styles.headerTitle}>
          {item.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <View style={styles.galleryContainer}>
          <Image
            source={{ uri: item.images[activeImageIndex] || item.images[0] }}
            style={styles.galleryImage}
            resizeMode="cover"
            accessibilityLabel={`${item.name} image`}
          />
          {item.images.length > 1 ? (
            <View style={styles.galleryDots}>
              {item.images.map((_, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setActiveImageIndex(idx)}
                  style={[
                    styles.dot,
                    activeImageIndex === idx && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Title & Category Info */}
        <View style={styles.mainInfo}>
          <View style={styles.tagsRow}>
            {isPackage ? (
              <View style={styles.packageTag}>
                <Text style={styles.packageTagText}>Turnkey Enterprise Package</Text>
              </View>
            ) : (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{item.category}</Text>
              </View>
            )}

            <View style={styles.slaTag}>
              <Text style={styles.slaTagText}>
                ⚡ {item.deliveryEstimateDays} Days Delivery
              </Text>
            </View>
          </View>

          <Text variant="title" style={styles.itemName}>
            {item.name}
          </Text>

          <Text variant="body" style={styles.description}>
            {item.description}
          </Text>
        </View>

        {/* Rental vs Purchase Selection */}
        <View style={styles.sectionCard}>
          <Text variant="label" style={styles.sectionHeader}>
            Acquisition Mode
          </Text>
          <RentalSaleToggle
            mode={selectedMode}
            onModeChange={(m) => setSelectedMode(m === "SALE" ? "SALE" : "RENTAL")}
            rentalSupported={hasRental}
            saleSupported={hasSale}
            rentalStartingPrice={item.rentPerPeriod ? `₹${item.rentPerPeriod.toLocaleString("en-IN")}` : undefined}
            saleStartingPrice={item.salePrice ? `₹${item.salePrice.toLocaleString("en-IN")}` : undefined}
          />

          {selectedMode === "RENTAL" && item.rentPerPeriod ? (
            <View style={styles.termsBox}>
              <Text variant="body" style={styles.termsTitle}>
                Rental Terms & Policies
              </Text>
              <View style={styles.termLine}>
                <Text variant="caption" style={styles.termLabel}>Monthly Rent:</Text>
                <Text variant="body" style={styles.termValue}>
                  ₹{item.rentPerPeriod.toLocaleString("en-IN")} /month
                </Text>
              </View>
              {item.depositAmount ? (
                <View style={styles.termLine}>
                  <Text variant="caption" style={styles.termLabel}>Refundable Deposit:</Text>
                  <Text variant="body" style={styles.termValue}>
                    ₹{item.depositAmount.toLocaleString("en-IN")}
                  </Text>
                </View>
              ) : null}
              {item.minRentalMonths ? (
                <View style={styles.termLine}>
                  <Text variant="caption" style={styles.termLabel}>Minimum Duration:</Text>
                  <Text variant="body" style={styles.termValue}>
                    {item.minRentalMonths} Months commitment
                  </Text>
                </View>
              ) : null}
              <View style={styles.termLine}>
                <Text variant="caption" style={styles.termLabel}>Policy:</Text>
                <Text variant="body" style={styles.termValue}>{item.returnPolicy}</Text>
              </View>
            </View>
          ) : selectedMode === "SALE" && item.salePrice ? (
            <View style={styles.termsBox}>
              <Text variant="body" style={styles.termsTitle}>
                Purchase Warranty & Support
              </Text>
              <View style={styles.termLine}>
                <Text variant="caption" style={styles.termLabel}>Ownership:</Text>
                <Text variant="body" style={styles.termValue}>Outright commercial purchase</Text>
              </View>
              {item.warrantyMonths ? (
                <View style={styles.termLine}>
                  <Text variant="caption" style={styles.termLabel}>Warranty:</Text>
                  <Text variant="body" style={styles.termValue}>{item.warrantyMonths} Months enterprise warranty</Text>
                </View>
              ) : null}
              <View style={styles.termLine}>
                <Text variant="caption" style={styles.termLabel}>Assembly:</Text>
                <Text variant="body" style={styles.termValue}>Free onsite assembly included</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Package Inclusions if Turnkey Package */}
        {isPackage && item.packageIncludedItems ? (
          <View style={styles.sectionCard}>
            <Text variant="label" style={styles.sectionHeader}>
              Package Inclusions ({item.packageCapacity ?? 50} Workstations)
            </Text>
            <View style={styles.inclusionsList}>
              {item.packageIncludedItems.map((inc, i) => (
                <View key={i} style={styles.inclusionItem}>
                  <Text style={styles.inclusionBullet}>✓</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={styles.inclusionName}>
                      {inc.name}
                    </Text>
                    <Text variant="caption" style={styles.inclusionMeta}>
                      Qty: {inc.quantity} • {inc.category}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Variants Selector */}
        {item.variants && item.variants.length > 0 ? (
          <View style={styles.sectionCard}>
            <FurnitureVariantSelector
              variants={item.variants as any}
              selectedVariantId={currentVariant?.id ?? null}
              onSelectVariant={(v) => setSelectedVariantId(v.id)}
            />
          </View>
        ) : null}

        {/* Quantity Controls */}
        <View style={styles.sectionCard}>
          <Text variant="label" style={styles.sectionHeader}>
            Quantity
          </Text>
          <View style={styles.qtyRow}>
            <View style={styles.qtyCounter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                onPress={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text variant="title" style={styles.qtyText}>
                {quantity}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                onPress={() => handleQuantityChange(1)}
                disabled={quantity >= item.availableQuantity}
                style={[
                  styles.qtyBtn,
                  quantity >= item.availableQuantity && styles.qtyBtnDisabled,
                ]}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>

            <View style={styles.stockNotice}>
              <Text variant="caption" style={styles.stockNoticeText}>
                {isOutOfStock
                  ? "Currently out of stock"
                  : `${item.availableQuantity} units available in stock`}
              </Text>
            </View>
          </View>
        </View>

        {/* Specifications & Dimensions */}
        <View style={styles.sectionCard}>
          <Text variant="label" style={styles.sectionHeader}>
            Specifications & Materials
          </Text>
          <View style={styles.specsGrid}>
            {item.dimensions ? (
              <View style={styles.specItem}>
                <Text variant="caption" style={styles.specLabel}>Dimensions</Text>
                <Text variant="body" style={styles.specValue}>
                  {item.dimensions.widthCm} x {item.dimensions.depthCm} x {item.dimensions.heightCm} cm
                </Text>
              </View>
            ) : null}
            {item.materials ? (
              <View style={styles.specItem}>
                <Text variant="caption" style={styles.specLabel}>Materials</Text>
                <Text variant="body" style={styles.specValue}>{item.materials.join(", ")}</Text>
              </View>
            ) : null}
            {item.specifications
              ? Object.entries(item.specifications).map(([key, value]) => (
                  <View key={key} style={styles.specItem}>
                    <Text variant="caption" style={styles.specLabel}>{key}</Text>
                    <Text variant="body" style={styles.specValue}>{value}</Text>
                  </View>
                ))
              : null}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceColumn}>
          <Text variant="caption" style={styles.barPriceLabel}>
            {selectedMode === "RENTAL" ? "Unit Monthly Rent" : "Unit Purchase Price"}
          </Text>
          <Text variant="title" style={styles.barPriceValue}>
            {selectedMode === "RENTAL" ? formattedRent : formattedSale}
          </Text>
          {selectedMode === "RENTAL" && item.depositAmount ? (
            <Text variant="caption" style={styles.barDepositSub}>
              + ₹{item.depositAmount.toLocaleString("en-IN")} deposit /unit
            </Text>
          ) : null}
        </View>

        <Button
          label={isOutOfStock ? "Out of Stock" : "Proceed to Checkout"}
          accessibilityLabel="Proceed to checkout"
          disabled={isOutOfStock}
          onPress={handleProceedToCheckout}
          variant="primary"
          size="medium"
          style={styles.checkoutBtn}
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
  scrollContent: {
    paddingBottom: 100,
  },
  loadingPadding: {
    padding: 16,
  },
  galleryContainer: {
    height: 250,
    width: "100%",
    backgroundColor: colors.mutedSurface,
    position: "relative",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryDots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  dotActive: {
    backgroundColor: colors.inverseContent,
    width: 18,
  },
  mainInfo: {
    backgroundColor: colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultBorder,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  packageTag: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  packageTagText: {
    color: colors.inverseContent,
    fontSize: 11,
    fontWeight: "700",
  },
  categoryTag: {
    backgroundColor: colors.mutedSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryTagText: {
    color: colors.secondaryContent,
    fontSize: 11,
    fontWeight: "600",
  },
  slaTag: {
    backgroundColor: colors.success.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  slaTagText: {
    color: colors.success.text,
    fontSize: 11,
    fontWeight: "600",
  },
  itemName: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primaryContent,
    marginBottom: 8,
  },
  description: {
    color: colors.secondaryContent,
    lineHeight: 20,
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.defaultBorder,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryContent,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  termsBox: {
    marginTop: 10,
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  termsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryContent,
    marginBottom: 4,
  },
  termLine: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  termLabel: {
    color: colors.secondaryContent,
    fontSize: 12,
  },
  termValue: {
    color: colors.primaryContent,
    fontSize: 12,
    fontWeight: "600",
  },
  inclusionsList: {
    gap: 8,
  },
  inclusionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  inclusionBullet: {
    color: colors.success.DEFAULT,
    fontWeight: "700",
    fontSize: 14,
  },
  inclusionName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryContent,
  },
  inclusionMeta: {
    fontSize: 11,
    color: colors.secondaryContent,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyCounter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.defaultBorder,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.3,
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.primaryContent,
  },
  qtyText: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  stockNotice: {
    flex: 1,
    marginLeft: 16,
  },
  stockNoticeText: {
    color: colors.secondaryContent,
    fontSize: 12,
  },
  specsGrid: {
    gap: 8,
  },
  specItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.subtleBorder,
  },
  specLabel: {
    color: colors.secondaryContent,
    fontSize: 12,
  },
  specValue: {
    color: colors.primaryContent,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
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
  priceColumn: {
    flex: 1,
  },
  barPriceLabel: {
    color: colors.secondaryContent,
    fontSize: 11,
  },
  barPriceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.brand.primary,
  },
  barDepositSub: {
    color: colors.mutedContent,
    fontSize: 11,
  },
  checkoutBtn: {
    marginLeft: 16,
    minWidth: 160,
  },
});
