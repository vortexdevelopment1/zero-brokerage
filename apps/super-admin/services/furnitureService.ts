import {
  FurniturePackage,
  FurnitureAsset,
  FurniturePackageFilters,
  FurnitureAssetFilters,
} from "@/types/furniture";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { MOCK_FURNITURE_PACKAGES, MOCK_FURNITURE_ASSETS } from "./mock/furniture.mock";
import { paginate } from "./mock/paginate";

class FurnitureService {
  private packages: FurniturePackage[] = [...MOCK_FURNITURE_PACKAGES];
  private assets: FurnitureAsset[] = [...MOCK_FURNITURE_ASSETS];

  async getPackages(
    filters: FurniturePackageFilters = {},
    params: PaginationParams = { page: 1, pageSize: 10 }
  ): Promise<PaginatedResult<FurniturePackage>> {
    let result = [...this.packages];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (filters.category && filters.category !== "all") {
      result = result.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((p) => p.status === filters.status);
    }

    if (filters.availability && filters.availability !== "all") {
      result = result.filter((p) => p.availability === filters.availability);
    }

    return paginate(result, params);
  }

  async getPackage(id: string): Promise<FurniturePackage | null> {
    return this.packages.find((p) => p.id === id) ?? null;
  }

  async updatePackageStatus(id: string, status: FurniturePackage["status"]): Promise<FurniturePackage> {
    const idx = this.packages.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Package not found");
    this.packages[idx] = {
      ...this.packages[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    return this.packages[idx];
  }

  async deletePackage(id: string): Promise<void> {
    this.packages = this.packages.filter((p) => p.id !== id);
  }

  async getAssets(
    filters: FurnitureAssetFilters = {},
    params: PaginationParams = { page: 1, pageSize: 10 }
  ): Promise<PaginatedResult<FurnitureAsset>> {
    let result = [...this.assets];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.sku.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    if (filters.category && filters.category !== "all") {
      result = result.filter((a) => a.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((a) => a.status === filters.status);
    }

    if (filters.availability && filters.availability !== "all") {
      result = result.filter((a) => a.availability === filters.availability);
    }

    return paginate(result, params);
  }

  async getAsset(id: string): Promise<FurnitureAsset | null> {
    return this.assets.find((a) => a.id === id) ?? null;
  }

  async updateAssetStatus(id: string, status: FurnitureAsset["status"]): Promise<FurnitureAsset> {
    const idx = this.assets.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Asset not found");
    this.assets[idx] = {
      ...this.assets[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    return this.assets[idx];
  }

  async deleteAsset(id: string): Promise<void> {
    this.assets = this.assets.filter((a) => a.id !== id);
  }
}

export const furnitureService = new FurnitureService();
