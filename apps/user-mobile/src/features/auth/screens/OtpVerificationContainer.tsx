import React, { useEffect, useState } from "react";

import { resendOtp, useAuthStore, verifyOtp } from "@/services/auth";

import { OtpVerificationScreen } from "./OtpVerificationScreen";

export function OtpVerificationContainer() {
  const phoneNumber = useAuthStore((state) => state.phoneNumber) ?? "";
  const challenge = useAuthStore((state) => state.challenge);
  const status = useAuthStore((state) => state.status);
  const storeError = useAuthStore((state) => state.errorMessage);
  const setErrorMessage = useAuthStore((state) => state.setErrorMessage);
  const changePhoneNumber = useAuthStore((state) => state.changePhoneNumber);

  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Compute remaining cooldown seconds from challenge
  const [countdownSeconds, setCountdownSeconds] = useState(() => {
    if (!challenge) {
      return 60;
    }
    const elapsed = Math.floor((Date.now() - challenge.requestedAt) / 1000);
    return Math.max(0, challenge.resendCooldownSeconds - elapsed);
  });

  useEffect(() => {
    if (!challenge) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - challenge.requestedAt) / 1000);
      const remaining = Math.max(0, challenge.resendCooldownSeconds - elapsed);
      setCountdownSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [challenge]);

  const isVerifying = status === "VERIFYING";
  const errorMessage = localError || storeError;

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    if (localError) {
      setLocalError(null);
    }
    if (storeError) {
      setErrorMessage(null);
    }

    // Auto-verify when 6 digits are reached
    if (newCode.length === 6 && !isVerifying) {
      verifyOtp(newCode);
    }
  }

  async function handleVerify() {
    if (isVerifying || code.length !== 6) {
      return;
    }
    setLocalError(null);
    if (storeError) {
      setErrorMessage(null);
    }
    await verifyOtp(code);
  }

  async function handleResend() {
    if (countdownSeconds > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setLocalError(null);
    if (storeError) {
      setErrorMessage(null);
    }

    const success = await resendOtp();
    setIsResending(false);

    if (success) {
      setCode("");
    }
  }

  function handleChangePhoneNumber() {
    changePhoneNumber();
  }

  return (
    <OtpVerificationScreen
      phoneNumber={phoneNumber}
      code={code}
      onCodeChange={handleCodeChange}
      onVerify={handleVerify}
      onResend={handleResend}
      onChangePhoneNumber={handleChangePhoneNumber}
      isVerifying={isVerifying}
      isResending={isResending}
      countdownSeconds={countdownSeconds}
      errorMessage={errorMessage}
    />
  );
}
