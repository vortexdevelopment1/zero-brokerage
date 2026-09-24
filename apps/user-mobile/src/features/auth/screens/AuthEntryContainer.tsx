import { useState } from "react";

import { AuthEntryScreen } from "./AuthEntryScreen";
import { validatePhoneNumber } from "../utils/phone-validation";

export function AuthEntryContainer() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handlePhoneNumberChange(value: string) {
    setPhoneNumber(value);

    if (errorMessage) {
      setErrorMessage(null);
    }
  }

  function handleContinue() {
    const result = validatePhoneNumber(phoneNumber);

    if (!result.valid) {
      setErrorMessage(result.message);
      return;
    }

    setPhoneNumber(result.normalizedValue);

    /**
     * OTP request will be connected once the backend authentication
     * contract is available.
     */
  }

  return (
    <AuthEntryScreen
      phoneNumber={phoneNumber}
      errorMessage={errorMessage}
      onPhoneNumberChange={handlePhoneNumberChange}
      onContinue={handleContinue}
    />
  );
}