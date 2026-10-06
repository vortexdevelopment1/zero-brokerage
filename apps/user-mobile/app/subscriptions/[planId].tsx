import React from "react";
import { useLocalSearchParams } from "expo-router";
import { SubscriptionPlanDetailScreen } from "@/features/subscriptions";

export default function SubscriptionPlanDetailRoute() {
  const { planId } = useLocalSearchParams<{ planId: string }>();

  return <SubscriptionPlanDetailScreen planId={String(planId || "")} />;
}
