import { UrgentRequirement, UrgentRequirementStatus } from "@/types/urgentRequirement";
import { mulberry32, pick, randInt, daysAgoISO, fullName, CITIES, LOCALITIES } from "./seed";

const STATUSES: UrgentRequirementStatus[] = ["new", "in-review", "contacted", "resolved"];

function generate(count: number): UrgentRequirement[] {
  const rng = mulberry32(1234);
  const out: UrgentRequirement[] = [];
  for (let i = 0; i < count; i++) {
    const city = pick(rng, CITIES);
    const locality = pick(rng, LOCALITIES[city] ?? ["Central"]);
    out.push({
      id: `URG-${(600 + i).toString()}`,
      user: fullName(rng),
      location: `${locality}, ${city}`,
      requirementContext: pick(rng, [
        "2BHK rental, budget ₹25k–35k/mo",
        "Commercial office, 40-50 seats",
        "Agricultural land, 2-5 acres",
        "Furnished 3BHK near tech park",
        "Retail showroom, high footfall zone",
      ]),
      searchCount: randInt(rng, 7, 22),
      windowHours: 72,
      flaggedAt: daysAgoISO(rng, 20),
      status: pick(rng, STATUSES),
    });
  }
  return out;
}

export const MOCK_URGENT_REQUIREMENTS: UrgentRequirement[] = generate(58);
