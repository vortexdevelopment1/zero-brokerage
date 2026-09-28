export type PhoneValidationResult =
  | {
      valid: true;
      normalizedValue: string;
    }
  | {
      valid: false;
      message: string;
    };

/**
 * Validates phone number input on the client for usability before backend submission.
 */
export function validatePhoneNumber(
  value: string,
  defaultCountryCode = "+91",
): PhoneValidationResult {
  const cleaned = value.replace(/[\s\-()]/g, "").trim();

  if (!cleaned) {
    return {
      valid: false,
      message: "Please enter your phone number.",
    };
  }

  // Must only contain digits or a leading plus
  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return {
      valid: false,
      message: "Phone number can only contain digits.",
    };
  }

  let normalized = cleaned;
  if (!normalized.startsWith("+")) {
    if (/^[6-9]\d{9}$/.test(normalized)) {
      normalized = `${defaultCountryCode}${normalized}`;
    } else if (normalized.length >= 10 && normalized.length <= 15) {
      normalized = `${defaultCountryCode}${normalized}`;
    } else {
      return {
        valid: false,
        message: "Please enter a valid 10-digit mobile number.",
      };
    }
  }

  const digitsOnly = normalized.replace("+", "");
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      valid: false,
      message: "Phone number must be between 10 and 15 digits.",
    };
  }

  return {
    valid: true,
    normalizedValue: normalized,
  };
}

/**
 * Masks a phone number for privacy-safe display on the OTP screen.
 * Example: +919876543210 -> +91 ******3210
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length <= 6) {
    return phone || "***";
  }

  const prefix = phone.slice(0, 3);
  const suffix = phone.slice(-4);
  const maskedLength = Math.max(phone.length - 7, 3);
  return `${prefix} ${"*".repeat(maskedLength)}${suffix}`;
}
