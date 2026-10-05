/**
 * Furniture Marketplace Screen
 *
 * Blueprint Step 8 Compliance:
 * 1. Discoverable entry point into furniture rentals, direct purchases, and office setups.
 * 2. Strict category and mode filtering via compact side-by-side dropdown menus.
 * 3. Search querying with debouncing.
 * 4. Distinct presentation for individual furniture vs turnkey setups.
 * 5. Pull-to-refresh, skeleton loading, error recovery, and empty states.
 * 6. Quick navigation to My Orders for tracking active rentals.
 * 7. Seamless in-app navigation and mode switching back to Properties.
 */

import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable as RNPressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Pressable, Text } from "@/components/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback";
import {
  ROUTES,
  getFurnitureDetailRoute,
  getFurnitureOrdersRoute,
} from "@/navigation/routes";
import { colors } from "@/theme/tokens";
import { useFurnitureCatalog } from "../hooks/useFurnitureCatalog";
import {
  FurnitureCard,
  type FurnitureDisplayMode,
} from "../components";
import type {
  FurnitureAsset,
  FurnitureCategory,
  FurnitureCatalogFilterParams,
} from "../types/furniture.types";

export interface FurnitureMarketplaceScreenProps {
  onBack?: () => void;
}

const MODE_OPTIONS: Array<{ key: FurnitureDisplayMode; label: string }> = [
  { key: "ALL", label: "All Offerings" },
  { key: "RENTAL", label: "Rentals" },
  { key: "SALE", label: "Purchase" },
  { key: "PACKAGE", label: "Turnkey Packages" },
];

const CATEGORY_OPTIONS: Array<{ key: FurnitureCategory | "ALL"; label: string }> = [
  { key: "ALL", label: "All Furniture Types" },
  { key: "WORKSTATION", label: "Workstations" },
  { key: "SEATING", label: "Chairs & Seating" },
  { key: "CONFERENCE", label: "Conference" },
  { key: "LOUNGE", label: "Lounge" },
  { key: "STORAGE", label: "Storage" },
  { key: "EXECUTIVE", label: "Executive" },
];

export function FurnitureMarketplaceScreen({
  onBack,
}: FurnitureMarketplaceScreenProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FurnitureCategory | "ALL">("ALL");
  const [selectedMode, setSelectedMode] = useState<FurnitureDisplayMode>("ALL");
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const selectedModeLabel = useMemo(() => {
    return MODE_OPTIONS.find((m) => m.key === selectedMode)?.label || "All Offerings";
  }, [selectedMode]);

  const selectedCategoryLabel = useMemo(() => {
    return CATEGORY_OPTIONS.find((c) => c.key === selectedCategory)?.label || "All Types";
  }, [selectedCategory]);

  const filterParams: FurnitureCatalogFilterParams = useMemo(() => {
    const params: {
      query?: string;
      category?: FurnitureCategory | "ALL";
      type?: "INDIVIDUAL" | "PACKAGE" | "ALL";
      mode?: "RENTAL" | "SALE" | "ALL";
    } = {};

    if (searchQuery.trim().length > 0) {
      params.query = searchQuery.trim();
    }
    if (selectedCategory !== "ALL") {
      params.category = selectedCategory;
    }
    if (selectedMode === "RENTAL") {
      params.mode = "RENTAL";
    } else if (selectedMode === "SALE") {
      params.mode = "SALE";
    } else if (selectedMode === "PACKAGE") {
      params.type = "PACKAGE";
    }
    return params;
  }, [searchQuery, selectedCategory, selectedMode]);

  const { items, isLoading, isRefreshing, errorMessage, refetch } =
    useFurnitureCatalog({ params: filterParams });

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.DISCOVER as any);
    }
  }

  function handleItemPress(item: FurnitureAsset) {
    router.push(getFurnitureDetailRoute(item.id) as any);
  }

  function handleGoToOrders() {
    router.push(getFurnitureOrdersRoute() as any);
  }

  function handleClearSearch() {
    setSearchQuery("");
  }

  function handleResetFilters() {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setSelectedMode("ALL");
    setIsModeDropdownOpen(false);
    setIsCategoryDropdownOpen(false);
  }

  return (
    <AppContainer style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to properties"
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text variant="title" style={styles.headerTitle}>
            Workspaces & Furniture
          </Text>
          <Text variant="caption" style={styles.headerSubtitle}>
            Zero Brokerage Enterprise Catalog
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View my furniture orders and rentals"
          onPress={handleGoToOrders}
          style={styles.ordersButton}
        >
          <Text variant="label" style={styles.ordersButtonText}>
            My Orders
          </Text>
        </Pressable>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search chairs, workstations, conference..."
            placeholderTextColor={colors.mutedContent}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search furniture catalog"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              onPress={handleClearSearch}
              style={styles.clearSearchBtn}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Dropdown Filters Row (Same level: Offerings on left, Furniture Type on right) */}
      <View style={styles.dropdownsRow}>
        {/* Left: Mode / Offerings Dropdown */}
        <Pressable
          accessibilityRole="combobox"
          accessibilityLabel={`Offering filter, currently ${selectedModeLabel}`}
          accessibilityState={{ expanded: isModeDropdownOpen }}
          onPress={() => {
            setIsCategoryDropdownOpen(false);
            setIsModeDropdownOpen((prev) => !prev);
          }}
          style={[
            styles.dropdownButton,
            selectedMode !== "ALL" && styles.dropdownButtonActive,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.dropdownButtonText,
              selectedMode !== "ALL" && styles.dropdownButtonTextActive,
            ]}
          >
            {selectedModeLabel}
          </Text>
          <Text style={styles.dropdownChevron}>
            {isModeDropdownOpen ? "▴" : "▾"}
          </Text>
        </Pressable>

        {/* Right: Furniture Type Dropdown */}
        <Pressable
          accessibilityRole="combobox"
          accessibilityLabel={`Furniture type filter, currently ${selectedCategoryLabel}`}
          accessibilityState={{ expanded: isCategoryDropdownOpen }}
          onPress={() => {
            setIsModeDropdownOpen(false);
            setIsCategoryDropdownOpen((prev) => !prev);
          }}
          style={[
            styles.dropdownButton,
            selectedCategory !== "ALL" && styles.dropdownButtonActive,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.dropdownButtonText,
              selectedCategory !== "ALL" && styles.dropdownButtonTextActive,
            ]}
          >
            {selectedCategoryLabel}
          </Text>
          <Text style={styles.dropdownChevron}>
            {isCategoryDropdownOpen ? "▴" : "▾"}
          </Text>
        </Pressable>
      </View>

      {/* Offerings Filter Dropdown Modal */}
      <Modal
        visible={isModeDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModeDropdownOpen(false)}
      >
        <RNPressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIsModeDropdownOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss offering menu"
        >
          <View style={styles.modalBackdrop} />
        </RNPressable>

        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text variant="caption" style={styles.modalTitle}>
              Offering Type
            </Text>
            <RNPressable
              onPress={() => setIsModeDropdownOpen(false)}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close offering menu"
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </RNPressable>
          </View>

          <View style={styles.modalBody}>
            {MODE_OPTIONS.map((opt) => {
              const isSelected = selectedMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    setSelectedMode(opt.key);
                    setIsModeDropdownOpen(false);
                  }}
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      isSelected && styles.modalItemTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected ? (
                    <Text style={styles.modalCheckmark}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Furniture Type Filter Dropdown Modal */}
      <Modal
        visible={isCategoryDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCategoryDropdownOpen(false)}
      >
        <RNPressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIsCategoryDropdownOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss furniture type menu"
        >
          <View style={styles.modalBackdrop} />
        </RNPressable>

        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text variant="caption" style={styles.modalTitle}>
              Furniture Type
            </Text>
            <RNPressable
              onPress={() => setIsCategoryDropdownOpen(false)}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close furniture type menu"
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </RNPressable>
          </View>

          <ScrollView style={{ maxHeight: 320 }} bounces={false}>
            {CATEGORY_OPTIONS.map((opt) => {
              const isSelected = selectedCategory === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    setSelectedCategory(opt.key);
                    setIsCategoryDropdownOpen(false);
                  }}
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      isSelected && styles.modalItemTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected ? (
                    <Text style={styles.modalCheckmark}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.skeletonCard}>
            <Skeleton width="100%" height={160} borderRadius={12} />
            <View style={{ height: 8 }} />
            <Skeleton width="70%" height={20} borderRadius={4} />
            <View style={{ height: 6 }} />
            <Skeleton width="40%" height={16} borderRadius={4} />
          </View>
          <View style={styles.skeletonCard}>
            <Skeleton width="100%" height={160} borderRadius={12} />
            <View style={{ height: 8 }} />
            <Skeleton width="60%" height={20} borderRadius={4} />
            <View style={{ height: 6 }} />
            <Skeleton width="35%" height={16} borderRadius={4} />
          </View>
        </View>
      ) : errorMessage ? (
        <ErrorState
          title="Could not load furniture"
          message={errorMessage}
          retryLabel="Try Again"
          onRetry={refetch}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No items found"
          description="We couldn't find any furniture or office packages matching your search criteria."
          actionLabel="Clear Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FurnitureCard
              item={item}
              onPress={handleItemPress}
              selectedMode={selectedMode}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={colors.brand.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    backgroundColor: colors.mutedSurface,
    marginRight: 8,
  },
  backText: {
    fontSize: 20,
    lineHeight: 22,
    color: colors.primaryContent,
    fontWeight: "700",
  },
  headerCenter: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryContent,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.secondaryContent,
    marginTop: 1,
  },
  ordersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.brand.light,
  },
  ordersButtonText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: colors.defaultBorder,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryContent,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: colors.secondaryContent,
    fontSize: 12,
  },
  dropdownsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultBorder,
    gap: 10,
  },
  dropdownButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.defaultBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownButtonActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.light,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondaryContent,
  },
  dropdownButtonTextActive: {
    color: colors.brand.primary,
    fontWeight: "700",
  },
  dropdownChevron: {
    fontSize: 10,
    color: colors.mutedContent,
    marginLeft: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  modalCard: {
    position: "absolute",
    top: "22%",
    left: 20,
    right: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.defaultBorder,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: 380,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.defaultBorder,
  },
  modalTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondaryContent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 13,
    color: colors.mutedContent,
    fontWeight: "600",
  },
  modalBody: {
    paddingVertical: 4,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  modalItemSelected: {
    backgroundColor: colors.brand.light,
  },
  modalItemText: {
    fontSize: 13,
    color: colors.primaryContent,
    fontWeight: "500",
  },
  modalItemTextSelected: {
    color: colors.brand.primary,
    fontWeight: "700",
  },
  modalCheckmark: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: "700",
  },
  loadingContainer: {
    padding: 16,
  },
  skeletonCard: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
});
