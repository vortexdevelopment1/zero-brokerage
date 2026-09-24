export type PhoneValidationResult =
  | {
      valid: true;
      normalizedValue: string;
    }
  | {
      valid: false;
      message: string;
    };

export function validatePhoneNumber(
  value: string,
): PhoneValidationResult {
  const normalizedValue = value.replace(/\s+/g, "").trim();

  if (!normalizedValue) {
    return {
      valid: false,
      message: "Enter your phone number.",
    };
  }

  if (!/^\+?[0-9]+$/.test(normalizedValue)) {
    return {
      valid: false,
      message: "Enter a valid phone number.",
    };
  }

  if (normalizedValue.replace("+", "").length < 10) {
    return {
      valid: false,
      message: "Enter a valid phone number.",
    };
  }

  return {
    valid: true,
    normalizedValue,
  };
}