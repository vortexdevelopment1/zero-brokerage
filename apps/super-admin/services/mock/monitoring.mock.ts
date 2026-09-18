import { MonitoringSnapshot } from "@/types/monitoring";
import { mulberry32, randInt } from "./seed";

export function getMockMonitoringSnapshot(): MonitoringSnapshot {
  const rng = mulberry32(1313);
  return {
    services: [
      { name: "Fastify API Gateway", health: "operational", latencyMs: randInt(rng, 40, 95), uptimePct: 99.98 },
      { name: "Auth Service", health: "operational", latencyMs: randInt(rng, 30, 70), uptimePct: 99.99 },
      { name: "Property Search Service", health: "operational", latencyMs: randInt(rng, 60, 118), uptimePct: 99.95 },
      { name: "Visit Scheduler", health: "degraded", latencyMs: randInt(rng, 150, 260), uptimePct: 99.4 },
      { name: "Payment Webhooks (Razorpay/Stripe)", health: "operational", latencyMs: randInt(rng, 80, 140), uptimePct: 99.9 },
      { name: "WhatsApp/SMS Dispatcher", health: "operational", latencyMs: randInt(rng, 90, 180), uptimePct: 99.7 },
    ],
    postgis: {
      spatialQueryLoad: randInt(rng, 40, 78),
      avgQueryMs: randInt(rng, 60, 118),
      gistIndexHealth: "operational",
    },
    redis: {
      cacheHitRatio: randInt(rng, 88, 98),
      memoryUsedPct: randInt(rng, 35, 72),
      connectedClients: randInt(rng, 120, 480),
    },
    latencyTrend: Array.from({ length: 12 }, (_, i) => ({
      time: `${(i * 2).toString().padStart(2, "0")}:00`,
      p50: randInt(rng, 40, 90),
      p95: randInt(rng, 110, 220),
    })),
  };
}
