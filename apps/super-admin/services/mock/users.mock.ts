import { AppUser, AppUserDetail, UserStatus, VerificationStatus, UserSubscriptionTier } from "@/types/user";
import { mulberry32, pick, randInt, daysAgoISO, fullName, CITIES } from "./seed";

const STATUSES: UserStatus[] = ["active", "active", "active", "blocked", "pending"];
const VERIFICATIONS: VerificationStatus[] = ["verified", "verified", "pending", "unverified"];
const TIERS: UserSubscriptionTier[] = [
  "None", "Micro-Pass", "Starter", "Starter", "Pro Seeker", "Investor Pass", "VIP Concierge",
];

function generateUsers(count: number): AppUser[] {
  const rng = mulberry32(1001);
  const users: AppUser[] = [];
  for (let i = 0; i < count; i++) {
    const name = fullName(rng);
    const id = `USR-${(10000 + i).toString()}`;
    users.push({
      id,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}${i}@mailbox.com`,
      phone: `+91 9${randInt(rng, 100000000, 999999999)}`,
      avatarSeed: id,
      verification: pick(rng, VERIFICATIONS),
      subscription: pick(rng, TIERS),
      status: pick(rng, STATUSES),
      city: pick(rng, CITIES),
      createdAt: daysAgoISO(rng, 420),
    });
  }
  return users;
}

export const MOCK_USERS: AppUser[] = generateUsers(186);

export function getMockUserDetail(id: string): AppUserDetail | null {
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) return null;
  const rng = mulberry32(id.length * 7919 + 3);
  return {
    ...user,
    activity: {
      searches: randInt(rng, 3, 240),
      savedProperties: randInt(rng, 0, 24),
      ownerContactsUsed: randInt(rng, 0, 15),
      lastActiveAt: daysAgoISO(rng, 14),
    },
    visits: Array.from({ length: randInt(rng, 0, 5) }, (_, i) => ({
      id: `VST-${id}-${i}`,
      property: pick(rng, ["Skyline Residency 3BHK", "Palm Grove Villa", "Cedar Business Park", "Green Acres Farmland"]),
      scheduledAt: daysAgoISO(rng, 90),
      status: pick(rng, ["Completed", "Scheduled", "Cancelled", "Rescheduled"]),
    })),
    transactions: Array.from({ length: randInt(rng, 0, 4) }, (_, i) => ({
      id: `TXN-${id}-${i}`,
      type: pick(rng, ["Subscription", "Micro-Transaction"]),
      amount: pick(rng, [29, 199, 499, 5, 10, 999]),
      status: pick(rng, ["Success", "Pending", "Failed"]),
      date: daysAgoISO(rng, 200),
    })),
  };
}
