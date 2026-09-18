import { Broker, BrokerDetail, BrokerStatus } from "@/types/broker";
import { mulberry32, pick, randInt, randFloat, daysAgoISO, fullName, CITIES } from "./seed";
import { MOCK_AGENCIES } from "./agencies.mock";

const VERIFICATIONS: BrokerStatus[] = ["verified", "verified", "verified", "pending", "suspended", "rejected"];

function generateBrokers(count: number): Broker[] {
  const rng = mulberry32(2002);
  const brokers: Broker[] = [];
  for (let i = 0; i < count; i++) {
    const name = fullName(rng);
    const id = `BRK-${(5000 + i).toString()}`;
    const verification = pick(rng, VERIFICATIONS);
    brokers.push({
      id,
      name,
      agency: rng() > 0.4 ? pick(rng, MOCK_AGENCIES).name : null,
      phone: `+91 8${randInt(rng, 100000000, 999999999)}`,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}${i}@broker.vortexcubes.com`,
      rating: randFloat(rng, 3, 5, 1),
      propertiesListed: randInt(rng, 2, 140),
      closures: randInt(rng, 0, 48),
      verification,
      status: verification === "suspended" ? "suspended" : "active",
      createdAt: daysAgoISO(rng, 500),
      city: pick(rng, CITIES),
    });
  }
  return brokers;
}

export const MOCK_BROKERS: Broker[] = generateBrokers(94);

export function getMockBrokerDetail(id: string): BrokerDetail | null {
  const broker = MOCK_BROKERS.find((b) => b.id === id);
  if (!broker) return null;
  const rng = mulberry32(id.length * 5051 + 7);
  const rankScore =
    (broker.verification === "verified" ? 1 : 0.4) * 0.4 +
    (broker.rating / 5) * 0.3 +
    Math.min(broker.closures / 50, 1) * 0.3;
  return {
    ...broker,
    rankScore: Math.round(rankScore * 100) / 100,
    reviews: Array.from({ length: randInt(rng, 0, 6) }, (_, i) => ({
      id: `REV-${id}-${i}`,
      reviewer: fullName(rng),
      rating: randInt(rng, 3, 5),
      comment: pick(rng, [
        "Very responsive and showed the property on time.",
        "Helped negotiate a fair deal quickly.",
        "Knowledgeable about the locality and paperwork.",
        "Rescheduled once but was professional throughout.",
        "Excellent follow-up after the site visit.",
      ]),
      date: daysAgoISO(rng, 240),
    })),
    recentListings: Array.from({ length: randInt(rng, 1, 6) }, (_, i) => ({
      id: `PRP-${id}-${i}`,
      title: pick(rng, [
        "2BHK Skyline Residency", "Bare-shell Office, Hitech City", "Agricultural Land Parcel",
        "3BHK Palm Grove Villa", "Retail Showroom, MG Road", "Co-working Suite",
      ]),
      status: pick(rng, ["Approved", "Pending", "Deal Done", "Not Available"]),
    })),
  };
}
