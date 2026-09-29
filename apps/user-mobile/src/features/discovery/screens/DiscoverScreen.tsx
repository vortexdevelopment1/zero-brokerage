/**
 * Discover Screen (Home Experience)
 *
 * Contract Neutrality:
 * - Does not claim curation, ranking, recommendations, or verification without backend confirmation.
 * - Uses neutral section terminology ("Properties", "Search Results").
 * - Does not pass unconfirmed category enums to the backend search API.
 * - Supports pull-to-refresh and independent section error boundaries.
 */

import React, { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { AppContainer } from "@/components/AppContainer";
import { DiscoverHeader } from "../components/DiscoverHeader";
import { SearchEntryBar } from "../components/SearchEntryBar";
import {
  CategoryShortcuts,
  PROVISIONAL_CATEGORIES,
} from "../components/CategoryShortcuts";
import { FurnitureBannerCard } from "../components/FurnitureBannerCard";
import { DiscoverSection } from "../components/DiscoverSection";
import { ListingCard } from "../components/ListingCard";
import { useDiscoveryFeed } from "../hooks/useDiscoveryFeed";
import { useListingSearch } from "../hooks/useListingSearch";
import type {
  ListingPresentationModel,
  PropertyCategoryItem,
} from "../types/discovery.types";
import { trackEvent } from "@/services/analytics/analytics";

export function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );

  const feedQuery = useDiscoveryFeed();
  const search = useListingSearch({
    query: searchQuery,
  });

  const isSearching = searchQuery.trim().length > 0;

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    search.setFilters((prev) => ({ ...prev, query: text }));
    if (text.length === 1) {
      trackEvent("search_started", { queryLength: text.length });
    }
  }

  function handleSelectCategory(cat: PropertyCategoryItem) {
    if (selectedCategory === cat.id) {
      setSelectedCategory(undefined);
      trackEvent("filter_reset", { type: "category" });
    } else {
      setSelectedCategory(cat.id);
      trackEvent("filter_applied", { category: cat.id });
    }
  }

  async function handleRefresh() {
    await Promise.all([feedQuery.refresh(), search.refresh()]);
  }

  return (
    <AppContainer>
      <View className="flex-1 bg-background">
        {/* Sticky Top Header with honest location state */}
        <DiscoverHeader />

        {/* Scrollable Discovery Feed */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={feedQuery.isRefreshing || search.isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {/* Search Input Bar */}
          <SearchEntryBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                trackEvent("search_submitted", { query: searchQuery.trim() });
              }
            }}
          />

          {/* Exploratory Category Shortcuts (Visual placeholder, pending backend taxonomy) */}
          <CategoryShortcuts
            categories={PROVISIONAL_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
          />

          {isSearching ? (
            /* Search Results View */
            <DiscoverSection
              title="Search Results"
              subtitle={
                search.items.length > 0
                  ? `${search.items.length} properties found`
                  : undefined
              }
              isLoading={search.isLoading}
              error={search.error}
              isEmpty={!search.isLoading && search.items.length === 0}
              emptyTitle="No properties found"
              emptyDescription="No properties match your current search query."
              onRetry={search.refresh}
            >
              {search.items.map((listing: ListingPresentationModel) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </DiscoverSection>
          ) : (
            /* Contract-Neutral Discovery Feed */
            <>
              {/* Contextual Furniture Living Banner */}
              <FurnitureBannerCard />

              {/* Primary Properties Section */}
              <DiscoverSection
                title="Properties"
                subtitle="Available property listings"
                isLoading={feedQuery.isLoading}
                isUnavailable={feedQuery.isUnavailable}
                isOffline={feedQuery.isOffline}
                error={feedQuery.errorMessage}
                isEmpty={
                  feedQuery.status === "success" &&
                  (!feedQuery.data?.sections ||
                    feedQuery.data.sections.length === 0)
                }
                emptyTitle="No properties available"
                emptyDescription="The property listings catalog is currently empty or updating."
                onRetry={feedQuery.refetch}
              >
                {/* Render listings when backend feed response is available */}
                {feedQuery.data?.sections?.[0]?.listings?.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </DiscoverSection>
            </>
          )}
        </ScrollView>
      </View>
    </AppContainer>
  );
}
