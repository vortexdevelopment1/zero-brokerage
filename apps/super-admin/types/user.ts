export type UserStatus = "active" | "blocked" | "pending";
export type VerificationStatus = "verified" | "unverified" | "pending";
export type UserSubscriptionTier =
  | "None"
  | "Micro-Pass"
  | "Starter"
  | "Pro Seeker"
  | "Investor Pass"
  | "VIP Concierge";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarSeed: string;
  verification: VerificationStatus;
  subscription: UserSubscriptionTier;
  status: UserStatus;
  city: string;
  createdAt: string;
}

export interface UserActivitySummary {
  searches: number;
  savedProperties: number;
  ownerContactsUsed: number;
  lastActiveAt: string;
}

export interface UserVisitHistoryItem {
  id: string;
  property: string;
  scheduledAt: string;
  status: string;
}

export interface UserTransactionHistoryItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  date: string;
}

export interface AppUserDetail extends AppUser {
  activity: UserActivitySummary;
  visits: UserVisitHistoryItem[];
  transactions: UserTransactionHistoryItem[];
}

export interface UserFilters {
  search?: string;
  status?: UserStatus | "all";
  subscription?: UserSubscriptionTier | "all";
  verification?: VerificationStatus | "all";
}
