// The urgency DETECTION algorithm lives entirely in the backend (Redis time-series
// velocity tracking). This type only models what the admin UI displays once a
// backend flag has already been raised. See BRD §2.4 / SOW §4.6.

export type UrgentRequirementStatus = "new" | "in-review" | "contacted" | "resolved";

export interface UrgentRequirement {
  id: string;
  user: string;
  location: string;
  requirementContext: string;
  searchCount: number;
  windowHours: number;
  flaggedAt: string;
  status: UrgentRequirementStatus;
}
