/**
 * Support Domain Types & API Contracts
 *
 * Strict Compliance:
 * 1. Blueprint Step 7 Section 10: In-App Support Entry Points.
 * 2. Uses approved support categories: VISIT_HELP, INQUIRY_HELP, TECHNICAL_ISSUE,
 *    LISTING_REPORT, ACCOUNT_PRIVACY, GENERAL_INQUIRY.
 * 3. Enforces character validation bounds: subject (5-100), message (10-1000).
 * 4. Never exposes internal staff notes, ticket assignment, or moderation queues.
 */

export type SupportCategory =
  | "VISIT_HELP"
  | "INQUIRY_HELP"
  | "TECHNICAL_ISSUE"
  | "LISTING_REPORT"
  | "ACCOUNT_PRIVACY"
  | "GENERAL_INQUIRY";

export type SupportTicketStatus =
  | "SUBMITTED"
  | "IN_REVIEW"
  | "RESOLVED"
  | "CLOSED";

export interface SupportTicketRecord {
  id: string; // RFC 4122 UUID
  ticketNumber: string; // e.g. "ZB-SUP-10824"
  category: SupportCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  relatedEntityType?: "VISIT" | "INQUIRY" | "LISTING" | null;
  relatedEntityId?: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateSupportTicketDto {
  category: SupportCategory;
  subject: string;
  message: string;
  relatedEntityType?: "VISIT" | "INQUIRY" | "LISTING";
  relatedEntityId?: string;
}

export interface SupportTicketListResponse {
  items: SupportTicketRecord[];
  total: number;
}

export interface SupportValidationErrors {
  category?: string;
  subject?: string;
  message?: string;
}
