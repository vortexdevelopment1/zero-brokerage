import type { Pool } from "pg";
import { NotFoundError } from "../../../common/errors/index.js";
import { ListingRepository } from "../repositories/listing-repository.js";
import type {
  Listing,
  ListingStatus,
  CreateListingParams,
  ListListingsParams,
} from "../types.js";
import type { PaginatedResponse } from "../../../common/pagination/index.js";

export class ListingService {
  private readonly listingRepo: ListingRepository;

  constructor(private readonly pool: Pool) {
    this.listingRepo = new ListingRepository(pool);
  }

  async listListings(params: ListListingsParams): Promise<PaginatedResponse<Listing>> {
    return this.listingRepo.listListings(params);
  }

  async getListingById(id: string): Promise<Listing> {
    const listing = await this.listingRepo.findById(id);
    if (!listing) {
      throw new NotFoundError(`Listing with id "${id}" was not found.`);
    }
    return listing;
  }

  async createListing(params: CreateListingParams): Promise<Listing> {
    return this.listingRepo.createListing(params);
  }

  async updateListingStatus(
    id: string,
    newStatus: ListingStatus,
    expectedCurrentStatuses?: ListingStatus[],
  ): Promise<Listing> {
    await this.getListingById(id);
    const updated = await this.listingRepo.updateStatus(id, newStatus, expectedCurrentStatuses);
    if (!updated) {
      throw new NotFoundError(`Listing with id "${id}" was not found or not in expected status.`);
    }
    return updated;
  }

  async approveListing(id: string): Promise<Listing> {
    return this.updateListingStatus(id, "PUBLISHED");
  }

  async rejectListing(id: string, _reason?: string): Promise<Listing> {
    return this.updateListingStatus(id, "REJECTED");
  }

  async suspendListing(id: string, _reason?: string): Promise<Listing> {
    return this.updateListingStatus(id, "SUSPENDED");
  }
}
