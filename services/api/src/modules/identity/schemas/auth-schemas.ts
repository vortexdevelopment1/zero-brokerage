import { z } from "zod";

export const requestOtpSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  purpose: z
    .enum([
      "AUTHENTICATION",
      "CHANGE_PHONE",
      "SENSITIVE_ACTION",
      "ACCOUNT_DELETION",
    ])
    .optional(),
});

export const verifyOtpSchema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID"),
  code: z.string().length(6, "Verification code must be exactly 6 digits"),
  deviceInfo: z.string().max(255).optional(),
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const revokeSessionParamsSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
});

export const changePhoneRequestSchema = z.object({
  newPhone: z.string().min(1, "New phone number is required"),
});

export const changePhoneConfirmSchema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID"),
  code: z.string().length(6, "Verification code must be exactly 6 digits"),
});

export const deleteAccountSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const stepUpVerifySchema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID"),
  code: z.string().length(6, "Verification code must be exactly 6 digits"),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>;
export type ChangePhoneRequestInput = z.infer<typeof changePhoneRequestSchema>;
export type ChangePhoneConfirmInput = z.infer<typeof changePhoneConfirmSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type StepUpVerifyInput = z.infer<typeof stepUpVerifySchema>;
