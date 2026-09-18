import { Visit, VisitStatus } from "@/types/visit";
import { mulberry32, pick, randInt, daysAgoISO, fullName } from "./seed";
import { MOCK_PROPERTIES } from "./properties.mock";

const STATUSES: VisitStatus[] = ["scheduled", "accepted", "rescheduled", "completed", "cancelled"];

function generateVisits(count: number): Visit[] {
  const rng = mulberry32(5005);
  const visits: Visit[] = [];
  for (let i = 0; i < count; i++) {
    const status = pick(rng, STATUSES);
    const date = daysAgoISO(rng, 60);
    visits.push({
      id: `VST-${(9000 + i).toString()}`,
      user: fullName(rng),
      broker: fullName(rng),
      property: pick(rng, MOCK_PROPERTIES).title,
      scheduledDate: date.slice(0, 10),
      scheduledTime: `${randInt(rng, 9, 18)}:${pick(rng, ["00", "15", "30", "45"])}`,
      status,
      checkInVerified: status === "completed" ? rng() > 0.15 : false,
    });
  }
  return visits;
}

export const MOCK_VISITS: Visit[] = generateVisits(160);
