export type FurnitureTypeSelection = "packages" | "assets";

export type FurnitureAvailability = "In Stock" | "Made to Order" | "Limited Stock" | "Reserved" | "Out of Stock";

export type FurnitureItemStatus = "active" | "pending" | "inactive";

export interface FurniturePackage {
  id: string;
  name: string;
  category: "Office" | "Workspace" | "Residential" | "Custom" | "Enterprise";
  assetCount: number;
  price: number;
  priceType: "fixed" | "monthly_rental";
  availability: FurnitureAvailability;
  status: FurnitureItemStatus;
  description: string;
  includedAssets: Array<{
    name: string;
    quantity: number;
    spec: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface FurnitureAsset {
  id: string;
  name: string;
  category:
    | "Chairs & Seating"
    | "Conference Tables"
    | "Desks & Workstations"
    | "Storage & Cabinets"
    | "Server Racks & IT"
    | "Reception & Couches"
    | "Cafeteria Equipment"
    | "Other Equipment";
  price: number;
  priceType: "fixed" | "monthly_rental";
  availability: FurnitureAvailability;
  status: FurnitureItemStatus;
  sku: string;
  dimensions?: string;
  material?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FurniturePackageFilters {
  search?: string;
  category?: string;
  status?: string;
  availability?: string;
}

export interface FurnitureAssetFilters {
  search?: string;
  category?: string;
  status?: string;
  availability?: string;
}
