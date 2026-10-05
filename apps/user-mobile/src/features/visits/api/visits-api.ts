/**
 * Visits Domain API
 *
 * Exposes clean domain functions delegating to the visitsRepository.
 * Ensures no screens directly reference HTTP methods or raw URLs.
 */

import { visitsRepository } from "./visits-adapter";
import type {
  CancelVisitDto,
  RequestVisitDto,
  RescheduleVisitDto,
  VisitAvailabilityResponse,
  VisitListResponse,
  VisitRecord,
} from "../types/visits.types";

export async function getVisits(
  signal?: AbortSignal,
): Promise<VisitListResponse> {
  return visitsRepository.getVisits(signal);
}

export async function getVisitById(
  visitId: string,
  signal?: AbortSignal,
): Promise<VisitRecord> {
  return visitsRepository.getVisitById(visitId, signal);
}

export async function requestVisit(
  dto: RequestVisitDto,
  signal?: AbortSignal,
): Promise<VisitRecord> {
  return visitsRepository.requestVisit(dto, signal);
}

export async function getVisitAvailability(
  listingId: string,
  signal?: AbortSignal,
): Promise<VisitAvailabilityResponse> {
  return visitsRepository.getVisitAvailability(listingId, signal);
}

export async function cancelVisit(
  visitId: string,
  dto?: CancelVisitDto,
  signal?: AbortSignal,
): Promise<VisitRecord> {
  return visitsRepository.cancelVisit(visitId, dto, signal);
}

export async function rescheduleVisit(
  visitId: string,
  dto: RescheduleVisitDto,
  signal?: AbortSignal,
): Promise<VisitRecord> {
  return visitsRepository.rescheduleVisit(visitId, dto, signal);
}
