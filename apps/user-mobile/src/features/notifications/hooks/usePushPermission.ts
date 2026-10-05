/**
 * Push Notification Permission UX Hook
 *
 * Blueprint Section 8 Compliance:
 * 1. Explains value proposition before prompting.
 * 2. Models permission states: UNDETERMINED, GRANTED, DENIED, UNAVAILABLE.
 * 3. Never treats push permission as authentication or communication consent.
 * 4. In-app notifications continue operating seamlessly even when push is denied.
 * 5. Telemetry tracking for prompt shown and outcome.
 */

import { useCallback, useState } from "react";
import { trackEvent } from "@/services/analytics/analytics";

export type PushPermissionStatus =
  | "UNDETERMINED"
  | "GRANTED"
  | "DENIED"
  | "UNAVAILABLE";

export function usePushPermission() {
  const [status, setStatus] = useState<PushPermissionStatus>("UNDETERMINED");
  const [isPromptVisible, setIsPromptVisible] = useState<boolean>(false);

  const showPrompt = useCallback(() => {
    setIsPromptVisible(true);
    trackEvent("push_permission_prompt_shown", {});
  }, []);

  const dismissPrompt = useCallback(() => {
    setIsPromptVisible(false);
  }, []);

  const grantPermission = useCallback(() => {
    setStatus("GRANTED");
    setIsPromptVisible(false);
    trackEvent("push_permission_result", { result: "granted" });
  }, []);

  const denyPermission = useCallback(() => {
    setStatus("DENIED");
    setIsPromptVisible(false);
    trackEvent("push_permission_result", { result: "denied" });
  }, []);

  return {
    status,
    isPromptVisible,
    showPrompt,
    dismissPrompt,
    grantPermission,
    denyPermission,
  };
}
