export type VisitStatus =
  | "scheduled"
  | "accepted"
  | "rescheduled"
  | "completed"
  | "cancelled";

export interface Visit {
  id: string;
  user: string;
  broker: string;
  property: string;
  scheduledDate: string;
  scheduledTime: string;
  status: VisitStatus;
  checkInVerified: boolean;
}

export interface VisitFilters {
  search?: string;
  status?: VisitStatus | "all";
}
