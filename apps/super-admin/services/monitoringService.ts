import { simulateNetwork } from "@/lib/api/client";
import { MonitoringSnapshot } from "@/types/monitoring";
import { getMockMonitoringSnapshot } from "@/services/mock/monitoring.mock";

/**
 * Monitoring service. Health calculations happen in the backend; the
 * frontend only visualizes whatever snapshot the monitoring endpoint
 * returns. Proposed contract: GET /api/admin/monitoring
 */
export const monitoringService = {
  getSnapshot: (): Promise<MonitoringSnapshot> => simulateNetwork(() => getMockMonitoringSnapshot(), { delayMs: 300 }),
};
