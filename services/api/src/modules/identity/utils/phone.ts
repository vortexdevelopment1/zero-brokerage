import { ValidationError } from "../../../common/errors/index.js";

/**
 * Normalizes a phone number to canonical E.164 format.
 * Defaults to India (+91) if a 10-digit number is supplied without country code.
 */
export function normalizePhoneNumber(input: string): string {
  if (!input || typeof input !== "string") {
    throw new ValidationError("Phone number must be a non-empty string.", [
      { field: "phone", message: "Phone number is required." },
    ]);
  }

  // Remove whitespace, dashes, parens
  const cleaned = input.trim().replace(/[\s\-()]/g, "");

  let normalized: string;

  if (cleaned.startsWith("+")) {
    normalized = cleaned;
  } else if (cleaned.startsWith("00")) {
    normalized = `+${cleaned.slice(2)}`;
  } else if (/^[6-9]\d{9}$/.test(cleaned)) {
    // 10-digit Indian mobile number
    normalized = `+91${cleaned}`;
  } else if (/^91[6-9]\d{9}$/.test(cleaned)) {
    // 12-digit Indian number without leading +
    normalized = `+${cleaned}`;
  } else if (/^0[6-9]\d{9}$/.test(cleaned)) {
    // 11-digit Indian number with leading 0
    normalized = `+91${cleaned.slice(1)}`;
  } else {
    normalized = `+${cleaned}`;
  }

  // Validate canonical E.164 format: + followed by 10 to 15 digits
  const e164Regex = /^\+[1-9]\d{9,14}$/;
  if (!e164Regex.test(normalized)) {
    throw new ValidationError(
      "Invalid phone number format. Must be a valid phone number in E.164 format.",
      [{ field: "phone", message: "Invalid phone number format." }],
    );
  }

  return normalized;
}

/**
 * Checks whether an input string is a valid phone number.
 */
export function isValidPhoneNumber(input: string): boolean {
  try {
    normalizePhoneNumber(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Masks a phone number for privacy-safe logs and public displays.
 * Example: +919876543210 -> +91 ******3210
 */
export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) {
    return "***";
  }

  const prefix = phone.slice(0, 3);
  const suffix = phone.slice(-4);
  const maskedLength = Math.max(phone.length - 7, 3);
  return `${prefix} ${"*".repeat(maskedLength)}${suffix}`;
}
