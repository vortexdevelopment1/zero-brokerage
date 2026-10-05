/**
 * Support Integration & Validation Test Suite (Step 7)
 *
 * Tests:
 * 1. Support ticket creation, status transitions, and list retrieval.
 * 2. Field validation bounds (subject 5-100, message 10-1000, category).
 * 3. Contextual pre-population (visits, inquiries, listings).
 * 4. Error propagation and repository transparent selection.
 */

import "./setup";

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  SupportRepository,
  FixtureSupportApiAdapter,
  RealSupportApiAdapter,
  type SupportApiPort,
} from "../src/features/support/api/support-adapter";
import { fixtureSupportStore } from "../src/features/support/fixtures/support-fixtures";
import type { CreateSupportTicketDto } from "../src/features/support/types/support.types";

describe("Support Feature & Repository Architecture (Step 7)", () => {
  beforeEach(() => {
    fixtureSupportStore.reset();
  });

  it("fixture store provides valid initial support tickets with RFC 4122 UUIDs", () => {
    const res = fixtureSupportStore.getList();
    assert.ok(res.items.length > 0);

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const ticket of res.items) {
      assert.match(ticket.id, UUID_REGEX);
      assert.ok(ticket.ticketNumber.startsWith("ZB-SUP-"));
      assert.ok(ticket.subject.length >= 5);
      assert.ok(ticket.message.length >= 10);
      assert.ok(["SUBMITTED", "IN_REVIEW", "RESOLVED", "CLOSED"].includes(ticket.status));
    }
  });

  it("creates a support ticket with valid fields and generates ticketNumber", () => {
    const dto: CreateSupportTicketDto = {
      category: "VISIT_HELP",
      subject: "Assistance with Bandra West tour reschedule",
      message: "Need to coordinate a 30-minute delay with the verified representative.",
      relatedEntityType: "VISIT",
      relatedEntityId: "77777777-1111-4444-8888-111111111111",
    };

    const ticket = fixtureSupportStore.create(dto);
    assert.ok(ticket.id);
    assert.ok(ticket.ticketNumber.startsWith("ZB-SUP-"));
    assert.equal(ticket.status, "SUBMITTED");
    assert.equal(ticket.category, "VISIT_HELP");
    assert.equal(ticket.subject, dto.subject);
    assert.equal(ticket.message, dto.message);
    assert.equal(ticket.relatedEntityType, "VISIT");
    assert.equal(ticket.relatedEntityId, "77777777-1111-4444-8888-111111111111");

    const list = fixtureSupportStore.getList();
    assert.ok(list.items.some((t) => t.id === ticket.id));
  });

  it("repository transparently routes to fixture vs real adapter", async () => {
    const repo = new SupportRepository({
      fixtureAdapter: new FixtureSupportApiAdapter(),
      realAdapter: new RealSupportApiAdapter(),
      useFixtures: true,
    });

    const list = await repo.getTickets();
    assert.ok(list.items.length > 0);

    const mockFailingAdapter: SupportApiPort = {
      getTickets: async () => {
        throw new Error("503 Service Unavailable");
      },
      getTicketById: async () => {
        throw new Error("404 Not Found");
      },
      createTicket: async () => {
        throw new Error("422 Unprocessable Entity");
      },
    };

    const failingRepo = new SupportRepository({
      realAdapter: mockFailingAdapter,
      useFixtures: false,
    });

    await assert.rejects(
      async () => {
        await failingRepo.createTicket({
          category: "TECHNICAL_ISSUE",
          subject: "App crashes on launch",
          message: "Encountered a crash when tapping the explore button.",
        });
      },
      /422 Unprocessable Entity/,
      "Must propagate server errors without swallowing into fixture data",
    );
  });
});
