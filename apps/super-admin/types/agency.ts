export type AgencyPlan = "Silver Partner" | "Gold Agency" | "Platinum Builder";
export type AgencyStatus = "pending" | "active" | "suspended" | "rejected";

export interface Agency {
  id: string;
  name: string;
  owner: string;
  plan: AgencyPlan;
  brokers: number;
  activeListings: number;
  status: AgencyStatus;
  city: string;
  createdAt: string;
}

export interface AgencyDetail extends Agency {
  email: string;
  phone: string;
  seatsUsed: number;
  seatsAllowed: number;
  boostCredits: number;
  brokerTeam: { id: string; name: string; closures: number }[];
}

export interface AgencyFilters {
  search?: string;
  status?: AgencyStatus | "all";
  plan?: AgencyPlan | "all";
}
