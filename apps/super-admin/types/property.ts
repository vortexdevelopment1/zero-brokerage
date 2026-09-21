export type PropertyMainCategory =
  | "residential"
  | "commercial"
  | "land"
  | "furniture";

export type PropertyStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "unavailable"
  | "hidden";

export interface Property {
  id: string;
  title: string;
  category: PropertyMainCategory;
  subtype: string;
  price: number;
  priceUnit: "sale" | "rent-month";
  city: string;
  locality: string;
  status: PropertyStatus;
  isLuxury: boolean;
  isPremium: boolean;
  broker: string | null;
  agency: string | null;
  createdAt: string;
  coordinates: { lat: number; lng: number };
}

export interface PropertyDetail extends Property {
  description: string;
  attributes: Record<string, string | number>;
  images: number; // count of media assets (mock)
}

export interface PropertyFilters {
  search?: string;
  category?: PropertyMainCategory | "all";
  status?: PropertyStatus | "all";
  minPrice?: number;
  maxPrice?: number;
  location?: string;
}
