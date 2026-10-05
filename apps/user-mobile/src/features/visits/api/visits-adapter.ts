/**
 * Visits API Adapter & Repository Architecture
 *
 * Enforces:
 * 1. Single Centralized API Client (apiRequest).
 * 2. Strict adherence to Fastify visits plugin routes (V1 - V6).
 * 3. Never swallows or converts 4xx/5xx errors into fixture fallbacks.
 * 4. Transparent port interface for testability and offline fixtures.
 */

import { apiRequest } from "@/services/api/client";
import {
  FIXTURE_USER_VISITS,
  generateFixtureAvailability,
  getFixtureVisitList,
} from "../fixtures/visits-fixtures";
import type {
  CancelVisitDto,
  RequestVisitDto,
  RescheduleVisitDto,
  VisitAvailabilityResponse,
  VisitListResponse,
  VisitRecord,
} from "../types/visits.types";

export interface VisitsApiPort {
  getVisits(signal?: AbortSignal): Promise<VisitListResponse>;
  getVisitById(visitId: string, signal?: AbortSignal): Promise<VisitRecord>;
  requestVisit(
    dto: RequestVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord>;
  getVisitAvailability(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<VisitAvailabilityResponse>;
  cancelVisit(
    visitId: string,
    dto?: CancelVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord>;
  rescheduleVisit(
    visitId: string,
    dto: RescheduleVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord>;
}

export const VISITS_ROUTES = {
  LIST: "/api/v1/visits",
  DETAIL: (visitId: string) =>
    `/api/v1/visits/${encodeURIComponent(visitId.trim())}`,
  REQUEST: "/api/v1/visits",
  AVAILABILITY: (listingId: string) =>
    `/api/v1/listings/${encodeURIComponent(listingId.trim())}/visit-availability`,
  CANCEL: (visitId: string) =>
    `/api/v1/visits/${encodeURIComponent(visitId.trim())}/cancel`,
  RESCHEDULE: (visitId: string) =>
    `/api/v1/visits/${encodeURIComponent(visitId.trim())}/reschedule`,
} as const;

/**
 * Real Fastify HTTP API Adapter for Visits (V1 - V6)
 */
export class RealVisitsApiAdapter implements VisitsApiPort {
  async getVisits(signal?: AbortSignal): Promise<VisitListResponse> {
    const res = await apiRequest<VisitListResponse>(VISITS_ROUTES.LIST, {
      method: "GET",
      signal,
    });
    return res.data;
  }

  async getVisitById(
    visitId: string,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    const res = await apiRequest<VisitRecord>(VISITS_ROUTES.DETAIL(visitId), {
      method: "GET",
      signal,
    });
    return res.data;
  }

  async requestVisit(
    dto: RequestVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    const res = await apiRequest<VisitRecord>(VISITS_ROUTES.REQUEST, {
      method: "POST",
      body: dto,
      signal,
    });
    return res.data;
  }

  async getVisitAvailability(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<VisitAvailabilityResponse> {
    const res = await apiRequest<VisitAvailabilityResponse>(
      VISITS_ROUTES.AVAILABILITY(listingId),
      {
        method: "GET",
        signal,
      },
    );
    return res.data;
  }

  async cancelVisit(
    visitId: string,
    dto?: CancelVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    const res = await apiRequest<VisitRecord>(VISITS_ROUTES.CANCEL(visitId), {
      method: "POST",
      body: dto ?? {},
      signal,
    });
    return res.data;
  }

  async rescheduleVisit(
    visitId: string,
    dto: RescheduleVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    const res = await apiRequest<VisitRecord>(
      VISITS_ROUTES.RESCHEDULE(visitId),
      {
        method: "POST",
        body: dto,
        signal,
      },
    );
    return res.data;
  }
}

/**
 * Fixture Visits Adapter for offline evaluation and UI tests
 */
export class FixtureVisitsApiAdapter implements VisitsApiPort {
  private inMemoryVisits: VisitRecord[] = [...FIXTURE_USER_VISITS];

  async getVisits(signal?: AbortSignal): Promise<VisitListResponse> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 40));
    return {
      items: [...this.inMemoryVisits],
      total: this.inMemoryVisits.length,
      nextCursor: null,
      hasMore: false,
    };
  }

  async getVisitById(
    visitId: string,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 40));
    const found = this.inMemoryVisits.find((v) => v.id === visitId);
    if (!found) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    return found;
  }

  async requestVisit(
    dto: RequestVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 60));
    const newVisit: VisitRecord = {
      id: `v-fixture-${Date.now()}`,
      userId: "fixture-user-00000000-0000-4000-8000-000000000001",
      listingId: dto.listingId,
      listingTitle: "Requested Property",
      listingLocalityName: "Indiranagar",
      listingCityName: "Bengaluru",
      listingCoverImageUrl:
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&auto=format&fit=crop",
      requestedStartAt: dto.requestedStartAt,
      requestedEndAt: dto.requestedEndAt,
      confirmedStartAt: null,
      confirmedEndAt: null,
      status: "REQUESTED",
      requestNote: dto.requestNote ?? null,
      cancellationReason: null,
      rescheduleReason: null,
      canCancel: true,
      canReschedule: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryVisits.unshift(newVisit);
    return newVisit;
  }

  async getVisitAvailability(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<VisitAvailabilityResponse> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 40));
    return generateFixtureAvailability(listingId);
  }

  async cancelVisit(
    visitId: string,
    dto?: CancelVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 60));
    const idx = this.inMemoryVisits.findIndex((v) => v.id === visitId);
    if (idx === -1) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    const updated: VisitRecord = {
      ...this.inMemoryVisits[idx],
      status: "CANCELLED_BY_USER",
      cancellationReason: dto?.reason ?? null,
      canCancel: false,
      canReschedule: false,
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryVisits[idx] = updated;
    return updated;
  }

  async rescheduleVisit(
    visitId: string,
    dto: RescheduleVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    await new Promise((r) => setTimeout(r, 60));
    const idx = this.inMemoryVisits.findIndex((v) => v.id === visitId);
    if (idx === -1) {
      throw new Error(`Visit not found: ${visitId}`);
    }
    const updated: VisitRecord = {
      ...this.inMemoryVisits[idx],
      requestedStartAt: dto.requestedStartAt,
      requestedEndAt: dto.requestedEndAt,
      rescheduleReason: dto.reason ?? null,
      status: "RESCHEDULE_REQUESTED",
      canReschedule: false,
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryVisits[idx] = updated;
    return updated;
  }
}

export interface VisitsRepositoryOptions {
  readonly realAdapter?: VisitsApiPort;
  readonly fixtureAdapter?: VisitsApiPort;
  readonly useFixtures?: boolean;
}

/**
 * Visits Repository
 * Explicit adapter routing with error discipline (does not silently swallow real errors).
 */
export class VisitsRepository implements VisitsApiPort {
  private readonly realAdapter: VisitsApiPort;
  private readonly fixtureAdapter: VisitsApiPort;
  private readonly explicitUseFixtures?: boolean;

  constructor(options?: VisitsRepositoryOptions) {
    this.realAdapter = options?.realAdapter ?? new RealVisitsApiAdapter();
    this.fixtureAdapter =
      options?.fixtureAdapter ?? new FixtureVisitsApiAdapter();
    this.explicitUseFixtures = options?.useFixtures;
  }

  private resolveAdapter(): VisitsApiPort {
    if (this.explicitUseFixtures !== undefined) {
      return this.explicitUseFixtures ? this.fixtureAdapter : this.realAdapter;
    }
    const envUseFixtures = process.env.EXPO_PUBLIC_USE_FIXTURES;
    if (envUseFixtures === "true" || envUseFixtures === "1") {
      return this.fixtureAdapter;
    }
    return this.realAdapter;
  }

  async getVisits(signal?: AbortSignal): Promise<VisitListResponse> {
    return this.resolveAdapter().getVisits(signal);
  }

  async getVisitById(
    visitId: string,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    return this.resolveAdapter().getVisitById(visitId, signal);
  }

  async requestVisit(
    dto: RequestVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    return this.resolveAdapter().requestVisit(dto, signal);
  }

  async getVisitAvailability(
    listingId: string,
    signal?: AbortSignal,
  ): Promise<VisitAvailabilityResponse> {
    return this.resolveAdapter().getVisitAvailability(listingId, signal);
  }

  async cancelVisit(
    visitId: string,
    dto?: CancelVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    return this.resolveAdapter().cancelVisit(visitId, dto, signal);
  }

  async rescheduleVisit(
    visitId: string,
    dto: RescheduleVisitDto,
    signal?: AbortSignal,
  ): Promise<VisitRecord> {
    return this.resolveAdapter().rescheduleVisit(visitId, dto, signal);
  }
}

export const visitsRepository = new VisitsRepository();
