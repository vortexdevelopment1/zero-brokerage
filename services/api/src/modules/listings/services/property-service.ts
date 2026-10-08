import type { Pool } from "pg";
import { NotFoundError } from "../../../common/errors/index.js";
import { PropertyRepository } from "../repositories/property-repository.js";
import type {
  Property,
  PropertyWithDistance,
  CreatePropertyParams,
  ListPropertiesParams,
  PropertyType,
} from "../types.js";
import type { GeoCoordinates, BoundingBox } from "@zero-brokerage/database";
import type { PaginatedResponse } from "../../../common/pagination/index.js";

export class PropertyService {
  private readonly propertyRepo: PropertyRepository;

  constructor(private readonly pool: Pool) {
    this.propertyRepo = new PropertyRepository(pool);
  }

  async listProperties(params: ListPropertiesParams): Promise<PaginatedResponse<Property>> {
    return this.propertyRepo.listProperties(params);
  }

  async getPropertyById(id: string): Promise<Property> {
    const property = await this.propertyRepo.findById(id);
    if (!property) {
      throw new NotFoundError(`Property with id "${id}" was not found.`);
    }
    return property;
  }

  async createProperty(params: CreatePropertyParams): Promise<Property> {
    return this.propertyRepo.createProperty(params);
  }

  async deleteProperty(id: string): Promise<void> {
    await this.getPropertyById(id);
    await this.propertyRepo.deleteProperty(id);
  }

  async searchByRadius(params: {
    center: GeoCoordinates;
    radiusMeters: number;
    limit?: number;
    propertyType?: PropertyType;
  }): Promise<PropertyWithDistance[]> {
    return this.propertyRepo.searchPropertiesByRadius(params);
  }

  async searchByBoundingBox(params: {
    bbox: BoundingBox;
    limit?: number;
    propertyType?: PropertyType;
  }): Promise<Property[]> {
    return this.propertyRepo.searchPropertiesByBoundingBox(params);
  }
}
