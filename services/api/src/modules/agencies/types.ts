import type { AgencyMembershipRole, AgencyMembershipStatus } from "../identity/types.js";

export type AgencyStatus =
  | "ACTIVE"
  | "PENDING_VERIFICATION"
  | "SUSPENDED"
  | "TERMINATED";

export interface Agency {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  licenseNumber: string | null;
  status: AgencyStatus;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AgencyMember {
  id: string;
  agencyId: string;
  userId: string;
  role: AgencyMembershipRole;
  status: AgencyMembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgencyParams {
  name: string;
  slug: string;
  legalName?: string | null | undefined;
  licenseNumber?: string | null | undefined;
  status?: AgencyStatus | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  addressLine1?: string | null | undefined;
  addressLine2?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  postalCode?: string | null | undefined;
  countryCode?: string | undefined;
}

export interface AddAgencyMemberParams {
  agencyId: string;
  userId: string;
  role: AgencyMembershipRole;
  status?: AgencyMembershipStatus | undefined;
}

export interface ListAgenciesParams {
  limit?: number | undefined;
  cursor?: string | null | undefined;
  status?: AgencyStatus | undefined;
  city?: string | undefined;
  search?: string | undefined;
}
