import { simulateNetwork } from "@/lib/api/client";
import { PaginatedResult, PaginationParams } from "@/types/common";
import { Broker, BrokerDetail, BrokerFilters } from "@/types/broker";
import { MOCK_BROKERS, getMockBrokerDetail } from "@/services/mock/brokers.mock";
import { paginate, matchesSearch } from "@/services/mock/paginate";

/**
 * Broker service — proposed contract:
 * GET /api/admin/brokers · GET /api/admin/brokers/:id · PATCH .../approve · .../reject · .../status
 */
export const brokerService = {
  getBrokers: (filters: BrokerFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<Broker>> =>
    simulateNetwork(() => {
      let rows = MOCK_BROKERS;
      if (filters.status && filters.status !== "all") rows = rows.filter((b) => b.verification === filters.status);
      if (filters.search) rows = rows.filter((b) => matchesSearch([b.name, b.email, b.phone, b.agency, b.id], filters.search));
      return paginate(rows, pagination);
    }),

  getBroker: (id: string): Promise<BrokerDetail | null> => simulateNetwork(() => getMockBrokerDetail(id)),

  approveBroker: (id: string): Promise<{ id: string; verification: string }> =>
    simulateNetwork(() => {
      const broker = MOCK_BROKERS.find((b) => b.id === id);
      if (broker) broker.verification = "verified";
      return { id, verification: "verified" };
    }),

  rejectBroker: (id: string): Promise<{ id: string; verification: string }> =>
    simulateNetwork(() => {
      const broker = MOCK_BROKERS.find((b) => b.id === id);
      if (broker) broker.verification = "rejected";
      return { id, verification: "rejected" };
    }),

  updateBrokerStatus: (id: string, status: Broker["status"]): Promise<{ id: string; status: Broker["status"] }> =>
    simulateNetwork(() => {
      const broker = MOCK_BROKERS.find((b) => b.id === id);
      if (broker) broker.status = status;
      return { id, status };
    }),

  getBrokerReviews: (id: string): Promise<BrokerDetail["reviews"]> =>
    simulateNetwork(() => getMockBrokerDetail(id)?.reviews ?? []),
};
