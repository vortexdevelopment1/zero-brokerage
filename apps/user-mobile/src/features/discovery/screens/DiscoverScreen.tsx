/**
 * Discover Screen (Home Experience)
 *
 * Visual & Editorial Foundations:
 * - Emotional hook: "Where to live?" with honest location indicator.
 * - Visual rhythm: Cinematic PropertyHero at the top, followed by editorial sections.
 * - Contextual Furniture entry point integrated between property collections.
 * - Dynamic search experience with focus states and filter triggers.
 * - Resilient state boundaries: skeleton loaders, graceful empty/error states.
 */

import React, { useMemo, useState } from "react";
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
import { PropertyHero } from "../components/PropertyHero";
import {
  PropertyHeroSkeleton,
  PropertyCardSkeleton,
} from "@/components/feedback";
import { useDiscoveryFeed } from "../hooks/useDiscoveryFeed";
import { useListingSearch } from "../hooks/useListingSearch";
import type {
  ListingPresentationModel,
  PropertyCategoryItem,
} from "../types/discovery.types";
import {
  matchesCategory,
  matchesLocation,
} from "../utils/discovery-filters";
import { trackEvent } from "@/services/analytics/analytics";

export function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

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
    if (selectedCategory === cat.id || cat.id === "cat-all") {
      setSelectedCategory(undefined);
      trackEvent("filter_reset", { type: "category" });
    } else {
      setSelectedCategory(cat.id);
      trackEvent("filter_applied", { category: cat.id });
    }
  }

  function handleResetFilters() {
    setSelectedCategory(undefined);
    setSelectedLocation("All Locations");
    trackEvent("filter_reset", { type: "all" });
  }

  async function handleRefresh() {
    await Promise.all([feedQuery.refresh(), search.refresh()]);
  }

  const sections = feedQuery.data?.sections || [];

  const isFilterActive =
    (!!selectedCategory && selectedCategory !== "cat-all") ||
    (selectedLocation !== "All Locations" && selectedLocation !== "all");

  const filteredSections = useMemo(() => {
    if (!isFilterActive) return sections;

    return sections
      .map((section) => ({
        ...section,
        listings: (section.listings || []).filter(
          (listing) =>
            matchesCategory(listing, selectedCategory) &&
            matchesLocation(listing, selectedLocation),
        ),
      }))
      .filter((section) => section.listings.length > 0);
  }, [sections, selectedCategory, selectedLocation, isFilterActive]);

  const hasAnyFilteredListings = filteredSections.some(
    (s) => (s.listings?.length ?? 0) > 0,
  );

  const displaySearchResults = useMemo(() => {
    return search.items.filter(
      (listing) =>
        matchesCategory(listing, selectedCategory) &&
        matchesLocation(listing, selectedLocation),
    );
  }, [search.items, selectedCategory, selectedLocation]);

  return (
    <AppContainer>
      <View className="flex-1 bg-background">
        {/* Sticky Top Header with location dropdown */}
        <DiscoverHeader
          selectedLocation={selectedLocation}
          onSelectLocation={(loc) => {
            setSelectedLocation(loc);
            trackEvent("location_selected", { location: loc });
          }}
        />

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
            isLoading={search.isLoading && isSearching}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                trackEvent("search_submitted", { query: searchQuery.trim() });
              }
            }}
          />

          {/* Exploratory Category Shortcuts */}
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
                displaySearchResults.length > 0
                  ? `${displaySearchResults.length} properties found`
                  : undefined
              }
              isLoading={search.isLoading}
              error={search.error}
              isEmpty={!search.isLoading && displaySearchResults.length === 0}
              emptyTitle="No properties found"
              emptyDescription="No properties match your current search and filters. Try searching for a different area or bedroom count."
              onRetry={search.refresh}
            >
              {displaySearchResults.map((listing: ListingPresentationModel) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </DiscoverSection>
          ) : feedQuery.isLoading ? (
            /* Layout-preserving Skeletons */
            <View className="px-5 pt-3">
              <PropertyHeroSkeleton />
              <PropertyCardSkeleton />
            </View>
          ) : isFilterActive && !hasAnyFilteredListings ? (
            /* Filtered Empty State */
            <View className="px-5 pt-6">
              <DiscoverSection
                title="Filtered Residences"
                subtitle="No properties match your active filters"
                isEmpty={true}
                emptyTitle="No residences found"
                emptyDescription={`No properties found for ${
                  selectedCategory
                    ? PROVISIONAL_CATEGORIES.find(
                        (c) => c.id === selectedCategory,
                      )?.label || "selected category"
                    : "all categories"
                } in ${selectedLocation}.`}
                onRetry={handleResetFilters}
              >
                <View />
              </DiscoverSection>
            </View>
          ) : (
            /* Visual Rhythm Discovery Feed */
            <>
              {filteredSections.length > 0 ? (
                filteredSections.map((section, sIndex) => {
                  const listings = section.listings || [];
                  if (listings.length === 0) return null;

                  // Render hero for the very first property
                  const hasHero = sIndex === 0 && listings.length > 0;
                  const heroListing = hasHero ? listings[0] : null;
                  const displayListings = hasHero
                    ? listings.slice(1)
                    : listings;

                  return (
                    <View key={section.id}>
                      {heroListing ? (
                        <View className="px-5 pt-3">
                          <PropertyHero
                            listing={heroListing}
                            label="FEATURED RESIDENCE"
                          />
                        </View>
                      ) : null}

                      {displayListings.length > 0 ? (
                        <DiscoverSection
                          title={section.title}
                          subtitle={section.subtitle}
                        >
                          {displayListings.map((listing) => (
                            <ListingCard key={listing.id} listing={listing} />
                          ))}
                        </DiscoverSection>
                      ) : null}

                      {/* Editorial Furniture Living moment after the primary showcase */}
                      {sIndex === 0 ? <FurnitureBannerCard /> : null}
                    </View>
                  );
                })
              ) : (
                /* Primary fallback section if feed is empty or offline */
                <DiscoverSection
                  title="Properties"
                  subtitle="Available property listings"
                  isUnavailable={feedQuery.isUnavailable}
                  isOffline={feedQuery.isOffline}
                  error={feedQuery.errorMessage}
                  isEmpty={feedQuery.status === "success"}
                  emptyTitle="No properties available"
                  emptyDescription="The property catalog is currently being updated. Please pull down to refresh."
                  onRetry={feedQuery.refetch}
                >
                  <View />
                </DiscoverSection>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </AppContainer>
  );
}
