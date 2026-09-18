export type BrokerStatus = "pending" | "verified" | "suspended" | "rejected";

export interface Broker {
  id: string;
  name: string;
  agency: string | null;
  phone: string;
  email: string;
  rating: number;
  propertiesListed: number;
  closures: number;
  verification: BrokerStatus;
  status: "active" | "suspended";
  createdAt: string;
  city: string;
}

export interface BrokerReview {
  id: string;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
}

export interface BrokerDetail extends Broker {
  rankScore: number;
  reviews: BrokerReview[];
  recentListings: { id: string; title: string; status: string }[];
}

export interface BrokerFilters {
  search?: string;
  status?: BrokerStatus | "all";
}
