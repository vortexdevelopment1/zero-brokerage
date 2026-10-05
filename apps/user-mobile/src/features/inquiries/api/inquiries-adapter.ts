/**
 * Inquiries API Adapter & Repository Architecture
 *
 * Enforces:
 * 1. Single Centralized API Client (apiRequest).
 * 2. Parity with Fastify inquiries plugin routes (I1 - I3).
 * 3. Never swallows or converts 4xx/5xx errors into fixture fallbacks.
 * 4. Transparent port interface for testability and offline fixtures.
 */

import { apiRequest } from "@/services/api/client";
import {
  FIXTURE_USER_INQUIRIES,
  getFixtureInquiryList,
} from "../fixtures/inquiries-fixtures";
import type {
  InquiryListResponse,
  InquiryRecord,
  SubmitInquiryDto,
} from "../types/inquiries.types";

export interface InquiriesApiPort {
  getInquiries(signal?: AbortSignal): Promise<InquiryListResponse>;
  getInquiryById(
    inquiryId: string,
    signal?: AbortSignal,
  ): Promise<InquiryRecord>;
  submitInquiry(
    dto: SubmitInquiryDto,
    signal?: AbortSignal,
  ): Promise<InquiryRecord>;
}

export const INQUIRIES_ROUTES = {
  SUBMIT: "/api/v1/inquiries",
  LIST: "/api/v1/inquiries",
  DETAIL: (inquiryId: string) =>
    `/api/v1/inquiries/${encodeURIComponent(inquiryId.trim())}`,
} as const;

/**
 * Real Fastify HTTP API Adapter for Inquiries (I1 - I3)
 */
export class RealInquiriesApiAdapter implements InquiriesApiPort {
  async getInquiries(signal?: AbortSignal): Promise<InquiryListResponse> {
    const res = await apiRequest<InquiryListResponse>(INQUIRIES_ROUTES.LIST, {
      method: "GET",
      signal,
    });
    return res.data;
  }

  async getInquiryById(
    inquiryId: string,
    signal?: AbortSignal,
  ): Promise<InquiryRecord> {
    const res = await apiRequest<InquiryRecord>(
      INQUIRIES_ROUTES.DETAIL(inquiryId),
      {
        method: "GET",
        signal,
      },
    );
    return res.data;
  }

  async submitInquiry(
    dto: SubmitInquiryDto,
    signal?: AbortSignal,
  ): Promise<InquiryRecord> {
    const res = await apiRequest<InquiryRecord>(INQUIRIES_ROUTES.SUBMIT, {
      method: "POST",
      body: dto,
      signal,
    });
    return res.data;
  }
}

/**
 * Fixture Inquiries Adapter for offline evaluation and UI tests
 */
export class FixtureInquiriesApiAdapter implements InquiriesApiPort {
  private inMemoryInquiries: InquiryRecord[] = [...FIXTURE_USER_INQUIRIES];

  async getInquiries(signal?: AbortSignal): Promise<InquiryListResponse> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 40));
    return {
      items: [...this.inMemoryInquiries],
      total: this.inMemoryInquiries.length,
      nextCursor: null,
      hasMore: false,
    };
  }

  async getInquiryById(
    inquiryId: string,
    signal?: AbortSignal,
  ): Promise<InquiryRecord> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 40));
    const found = this.inMemoryInquiries.find((i) => i.id === inquiryId);
    if (!found) {
      throw new Error(`Inquiry not found: ${inquiryId}`);
    }
    return found;
  }

  async submitInquiry(
    dto: SubmitInquiryDto,
    signal?: AbortSignal,
  ): Promise<InquiryRecord> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 60));
    const newInquiry: InquiryRecord = {
      id: `inq-fixture-${Date.now()}`,
      userId: "fixture-user-00000000-0000-4000-8000-000000000001",
      listingId: dto.listingId,
      listingTitle: "Inquired Property",
      listingLocalityName: "Indiranagar",
      listingCityName: "Bengaluru",
      listingCoverImageUrl:
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&auto=format&fit=crop",
      message: dto.message,
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryInquiries.unshift(newInquiry);
    return newInquiry;
  }
}

export interface InquiriesRepositoryOptions {
  readonly realAdapter?: InquiriesApiPort;
  readonly fixtureAdapter?: InquiriesApiPort;
  readonly useFixtures?: boolean;
}

export class InquiriesRepository implements InquiriesApiPort {
  private readonly realAdapter: InquiriesApiPort;
  private readonly fixtureAdapter: InquiriesApiPort;
  private readonly explicitUseFixtures?: boolean;

  constructor(options?: InquiriesRepositoryOptions) {
    this.realAdapter = options?.realAdapter ?? new RealInquiriesApiAdapter();
    this.fixtureAdapter =
      options?.fixtureAdapter ?? new FixtureInquiriesApiAdapter();
    this.explicitUseFixtures = options?.useFixtures;
  }

  private resolveAdapter(): InquiriesApiPort {
    if (this.explicitUseFixtures !== undefined) {
      return this.explicitUseFixtures ? this.fixtureAdapter : this.realAdapter;
    }
    const envUseFixtures = process.env.EXPO_PUBLIC_USE_FIXTURES;
    if (envUseFixtures === "true" || envUseFixtures === "1") {
      return this.fixtureAdapter;
    }
    return this.realAdapter;
  }

  async getInquiries(signal?: AbortSignal): Promise<InquiryListResponse> {
    return this.resolveAdapter().getInquiries(signal);
  }

  async getInquiryById(
    inquiryId: string,
    signal?: AbortSignal,
  ): Promise<InquiryRecord> {
    return this.resolveAdapter().getInquiryById(inquiryId, signal);
  }

  async submitInquiry(
    dto: SubmitInquiryDto,
    signal?: AbortSignal,
  ): Promise<InquiryRecord> {
    return this.resolveAdapter().submitInquiry(dto, signal);
  }
}

export const inquiriesRepository = new InquiriesRepository();
