export type ServiceHealth = "operational" | "degraded" | "down";

export interface ServiceStatusItem {
  name: string;
  health: ServiceHealth;
  latencyMs: number;
  uptimePct: number;
}

export interface MonitoringSnapshot {
  services: ServiceStatusItem[];
  postgis: { spatialQueryLoad: number; avgQueryMs: number; gistIndexHealth: ServiceHealth };
  redis: { cacheHitRatio: number; memoryUsedPct: number; connectedClients: number };
  latencyTrend: { time: string; p50: number; p95: number }[];
}
