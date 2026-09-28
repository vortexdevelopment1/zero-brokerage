import React, { useState } from "react";

import { requestOtp, useAuthStore } from "@/services/auth";

import { validatePhoneNumber } from "../utils/phone-validation";
import { AuthEntryScreen } from "./AuthEntryScreen";

export function AuthEntryContainer() {
  const storedPhone = useAuthStore((state) => state.phoneNumber);
  const status = useAuthStore((state) => state.status);
  const storeError = useAuthStore((state) => state.errorMessage);
  const setErrorMessage = useAuthStore((state) => state.setErrorMessage);

  const [phoneNumber, setPhoneNumber] = useState(
    storedPhone ? storedPhone.replace("+91", "") : "",
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const isLoading = status === "OTP_REQUESTING";
  const errorMessage = localError || storeError;

  function handlePhoneNumberChange(value: string) {
    setPhoneNumber(value);
    if (localError) {
      setLocalError(null);
    }
    if (storeError) {
      setErrorMessage(null);
    }
  }

  async function handleContinue() {
    if (isLoading) {
      return;
    }

    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }

    setLocalError(null);
    if (storeError) {
      setErrorMessage(null);
    }

    await requestOtp(validation.normalizedValue);
  }

  return (
    <AuthEntryScreen
      phoneNumber={phoneNumber}
      errorMessage={errorMessage}
      onPhoneNumberChange={handlePhoneNumberChange}
      onContinue={handleContinue}
      isLoading={isLoading}
    />
  );
}
