/**
 * Discovery Filtering Utilities
 *
 * Implements client-side category and location filtering for luxury residences.
 */

import type { ListingPresentationModel } from "../types/discovery.types";

/**
 * Checks whether a listing matches the selected exploratory category shortcut.
 */
export function matchesCategory(
  listing: ListingPresentationModel,
  categoryId?: string,
): boolean {
  if (!categoryId || categoryId === "cat-all") return true;

  const type = (listing.propertyType || "").toLowerCase();
  const title = (listing.title || "").toLowerCase();

  switch (categoryId) {
    case "cat-penthouse":
      return type.includes("penthouse") || title.includes("penthouse");
    case "cat-villa":
      return type.includes("villa") || title.includes("villa");
    case "cat-residential":
      return (
        type.includes("penthouse") ||
        type.includes("villa") ||
        title.includes("penthouse") ||
        title.includes("villa")
      );
    case "cat-apartments":
      return (
        type.includes("apartment") ||
        type.includes("flat") ||
        title.includes("apartment") ||
        title.includes("flat")
      );
    case "cat-furnished":
      return (
        type.includes("loft") ||
        type.includes("duplex") ||
        title.includes("loft") ||
        title.includes("courtyard") ||
        title.includes("terrazzo")
      );
    default:
      return true;
  }
}

/**
 * Checks whether a listing matches the selected geographic location filter.
 */
export function matchesLocation(
  listing: ListingPresentationModel,
  location?: string,
): boolean {
  if (!location || location === "All Locations" || location === "all") {
    return true;
  }

  const loc = location.toLowerCase();
  const city = (listing.cityName || "").toLowerCase();
  const locality = (listing.localityName || "").toLowerCase();

  return city.includes(loc) || locality.includes(loc);
}
