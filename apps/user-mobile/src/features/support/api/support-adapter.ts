/**
 * Support API Adapter & Repository Architecture
 *
 * Enforces:
 * 1. Single Centralized API Client (apiRequest).
 * 2. Strict adherence to Fastify support routes.
 * 3. Never swallows or converts 4xx/5xx errors into fixture fallbacks.
 * 4. Transparent port interface for testability and offline fixtures.
 */

import { apiRequest } from "@/services/api/client";
import { fixtureSupportStore } from "../fixtures/support-fixtures";
import { SUPPORT_ROUTES } from "./support-api";
import type {
  CreateSupportTicketDto,
  SupportTicketListResponse,
  SupportTicketRecord,
} from "../types/support.types";

export interface SupportApiPort {
  getTickets(signal?: AbortSignal): Promise<SupportTicketListResponse>;
  getTicketById(ticketId: string, signal?: AbortSignal): Promise<SupportTicketRecord>;
  createTicket(
    dto: CreateSupportTicketDto,
    signal?: AbortSignal,
  ): Promise<SupportTicketRecord>;
}

export class RealSupportApiAdapter implements SupportApiPort {
  async getTickets(signal?: AbortSignal): Promise<SupportTicketListResponse> {
    const res = await apiRequest<SupportTicketListResponse>(
      SUPPORT_ROUTES.TICKETS,
      {
        method: "GET",
        signal,
      },
    );
    return res.data;
  }

  async getTicketById(
    ticketId: string,
    signal?: AbortSignal,
  ): Promise<SupportTicketRecord> {
    const res = await apiRequest<SupportTicketRecord>(
      SUPPORT_ROUTES.TICKET_DETAIL(ticketId),
      {
        method: "GET",
        signal,
      },
    );
    return res.data;
  }

  async createTicket(
    dto: CreateSupportTicketDto,
    signal?: AbortSignal,
  ): Promise<SupportTicketRecord> {
    const res = await apiRequest<SupportTicketRecord>(
      SUPPORT_ROUTES.TICKETS,
      {
        method: "POST",
        body: dto,
        signal,
      },
    );
    return res.data;
  }
}

export class FixtureSupportApiAdapter implements SupportApiPort {
  async getTickets(): Promise<SupportTicketListResponse> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return fixtureSupportStore.getList();
  }

  async getTicketById(ticketId: string): Promise<SupportTicketRecord> {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const ticket = fixtureSupportStore.getById(ticketId);
    if (!ticket) {
      throw new Error(`Support ticket '${ticketId}' not found.`);
    }
    return ticket;
  }

  async createTicket(dto: CreateSupportTicketDto): Promise<SupportTicketRecord> {
    await new Promise((resolve) => setTimeout(resolve, 40));
    return fixtureSupportStore.create(dto);
  }
}

export class SupportRepository implements SupportApiPort {
  private readonly realAdapter: SupportApiPort;
  private readonly fixtureAdapter: SupportApiPort;
  private explicitUseFixtures?: boolean;

  constructor(options?: {
    realAdapter?: SupportApiPort;
    fixtureAdapter?: SupportApiPort;
    useFixtures?: boolean;
  }) {
    this.realAdapter = options?.realAdapter ?? new RealSupportApiAdapter();
    this.fixtureAdapter =
      options?.fixtureAdapter ?? new FixtureSupportApiAdapter();
    this.explicitUseFixtures = options?.useFixtures;
  }

  private resolveAdapter(): SupportApiPort {
    if (this.explicitUseFixtures !== undefined) {
      return this.explicitUseFixtures ? this.fixtureAdapter : this.realAdapter;
    }
    const envUseFixtures = process.env.EXPO_PUBLIC_USE_FIXTURES;
    if (envUseFixtures === "false" || envUseFixtures === "0") {
      return this.realAdapter;
    }
    return this.fixtureAdapter;
  }

  async getTickets(signal?: AbortSignal): Promise<SupportTicketListResponse> {
    return this.resolveAdapter().getTickets(signal);
  }

  async getTicketById(
    ticketId: string,
    signal?: AbortSignal,
  ): Promise<SupportTicketRecord> {
    return this.resolveAdapter().getTicketById(ticketId, signal);
  }

  async createTicket(
    dto: CreateSupportTicketDto,
    signal?: AbortSignal,
  ): Promise<SupportTicketRecord> {
    return this.resolveAdapter().createTicket(dto, signal);
  }
}

export const supportRepository = new SupportRepository();
