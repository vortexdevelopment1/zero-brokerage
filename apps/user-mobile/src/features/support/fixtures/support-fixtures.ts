/**
 * Support Tickets Fixtures & Mock State
 */

import type {
  CreateSupportTicketDto,
  SupportTicketListResponse,
  SupportTicketRecord,
} from "../types/support.types";

export const FIXTURE_SUPPORT_TICKETS: SupportTicketRecord[] = [
  {
    id: "f1111111-4444-5555-8888-111111111111",
    ticketNumber: "ZB-SUP-20491",
    category: "VISIT_HELP",
    subject: "Reschedule request assistance for Bandra tour",
    message: "I need to coordinate with the representative to adjust the time by 30 minutes due to travel delay.",
    status: "IN_REVIEW",
    relatedEntityType: "VISIT",
    relatedEntityId: "77777777-1111-4444-8888-111111111111",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "f2222222-4444-5555-8888-222222222222",
    ticketNumber: "ZB-SUP-19830",
    category: "ACCOUNT_PRIVACY",
    subject: "Phone number update query",
    message: "Requesting assistance regarding SMS OTP delivery on international roaming.",
    status: "RESOLVED",
    relatedEntityType: null,
    relatedEntityId: null,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
];

class FixtureSupportStore {
  private tickets: SupportTicketRecord[] = [...FIXTURE_SUPPORT_TICKETS];
  private counter = 20500;

  getList(): SupportTicketListResponse {
    return {
      items: [...this.tickets],
      total: this.tickets.length,
    };
  }

  getById(id: string): SupportTicketRecord | null {
    return this.tickets.find((t) => t.id === id) ?? null;
  }

  create(dto: CreateSupportTicketDto): SupportTicketRecord {
    this.counter++;
    const newTicket: SupportTicketRecord = {
      id: `f${this.counter}11-4444-5555-8888-000000000000`,
      ticketNumber: `ZB-SUP-${this.counter}`,
      category: dto.category,
      subject: dto.subject.trim(),
      message: dto.message.trim(),
      status: "SUBMITTED",
      relatedEntityType: dto.relatedEntityType ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tickets.unshift(newTicket);
    return newTicket;
  }

  reset(): void {
    this.tickets = FIXTURE_SUPPORT_TICKETS.map((t) => ({ ...t }));
  }
}

export const fixtureSupportStore = new FixtureSupportStore();
