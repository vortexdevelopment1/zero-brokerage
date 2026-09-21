import { Agency, AgencyDetail, AgencyPlan, AgencyStatus } from "@/types/agency";
import { mulberry32, pick, randInt, daysAgoISO, fullName, CITIES } from "./seed";

const PLANS: AgencyPlan[] = ["Silver Partner", "Gold Agency", "Platinum Builder"];
const STATUSES: AgencyStatus[] = ["active", "active", "active", "pending", "suspended"];
const PLAN_CAPACITY: Record<AgencyPlan, { listings: number; seats: number }> = {
  "Silver Partner": { listings: 50, seats: 2 },
  "Gold Agency": { listings: 200, seats: 10 },
  "Platinum Builder": { listings: 5000, seats: 50 },
};

const AGENCY_WORDS = [
  "Skyline", "Horizon", "Evergreen", "Pinnacle", "Meridian", "Cedar", "Northgate", "Silverline",
  "Golden", "Harbor", "Crescent", "Summit", "Vantage", "Elevate", "Bluewave", "Regency",
];
const AGENCY_SUFFIX = ["Estates", "Realty", "Properties", "Builders", "Developers", "Homes", "Group"];

function generateAgencies(count: number): Agency[] {
  const rng = mulberry32(3003);
  const agencies: Agency[] = [];
  for (let i = 0; i < count; i++) {
    const plan = pick(rng, PLANS);
    const cap = PLAN_CAPACITY[plan];
    const name = `${pick(rng, AGENCY_WORDS)} ${pick(rng, AGENCY_SUFFIX)}`;
    agencies.push({
      id: `AGY-${(3000 + i).toString()}`,
      name: `${name} ${i}`,
      owner: fullName(rng),
      plan,
      brokers: randInt(rng, 1, cap.seats),
      activeListings: randInt(rng, 0, Math.min(cap.listings, 320)),
      status: pick(rng, STATUSES),
      city: pick(rng, CITIES),
      createdAt: daysAgoISO(rng, 600),
    });
  }
  return agencies;
}

export const MOCK_AGENCIES: Agency[] = generateAgencies(52);

export function getMockAgencyDetail(id: string): AgencyDetail | null {
  const agency = MOCK_AGENCIES.find((a) => a.id === id);
  if (!agency) return null;
  const rng = mulberry32(id.length * 4111 + 11);
  const cap = PLAN_CAPACITY[agency.plan];
  return {
    ...agency,
    email: `contact@${agency.name.toLowerCase().replace(/\s+/g, "")}.com`,
    phone: `+91 7${randInt(rng, 100000000, 999999999)}`,
    seatsUsed: agency.brokers,
    seatsAllowed: cap.seats,
    boostCredits: agency.plan === "Gold Agency" ? 5 : agency.plan === "Platinum Builder" ? 12 : 0,
    brokerTeam: Array.from({ length: agency.brokers }, (_, i) => ({
      id: `BRK-TEAM-${id}-${i}`,
      name: fullName(rng),
      closures: randInt(rng, 0, 30),
    })),
  };
}
