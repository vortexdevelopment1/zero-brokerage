/**
 * Inquiries Domain API
 * Exposes clean domain functions delegating to inquiriesRepository.
 */

import { inquiriesRepository } from "./inquiries-adapter";
import type {
  InquiryListResponse,
  InquiryRecord,
  SubmitInquiryDto,
} from "../types/inquiries.types";

export async function getInquiries(
  signal?: AbortSignal,
): Promise<InquiryListResponse> {
  return inquiriesRepository.getInquiries(signal);
}

export async function getInquiryById(
  inquiryId: string,
  signal?: AbortSignal,
): Promise<InquiryRecord> {
  return inquiriesRepository.getInquiryById(inquiryId, signal);
}

export async function submitInquiry(
  dto: SubmitInquiryDto,
  signal?: AbortSignal,
): Promise<InquiryRecord> {
  return inquiriesRepository.submitInquiry(dto, signal);
}
