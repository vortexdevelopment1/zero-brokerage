/**
 * Support Request Form Screen
 *
 * Enforces:
 * 1. Blueprint Step 7 Section 10 Validation Bounds:
 *    - Subject: 5 to 100 characters.
 *    - Message: 10 to 1,000 characters.
 *    - Category must be an approved category.
 * 2. Duplicate submission prevention.
 * 3. Loading, success, and error feedback states.
 * 4. Contextual pre-population (visits, inquiries, listings).
 */

import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppContainer } from "@/components/AppContainer";
import { Box, Button, Card, Pressable, Stack, Text } from "@/components/primitives";
import { ROUTES } from "@/navigation/routes";
import { trackEvent } from "@/services/analytics/analytics";
import { colors } from "@/theme/tokens";
import { useSubmitSupportTicket } from "../hooks/useSubmitSupportTicket";
import type {
  CreateSupportTicketDto,
  SupportCategory,
  SupportTicketRecord,
} from "../types/support.types";

const CATEGORY_OPTIONS: Array<{ key: SupportCategory; label: string }> = [
  { key: "VISIT_HELP", label: "Visit / Tour Assistance" },
  { key: "INQUIRY_HELP", label: "Inquiry / Agent Communication" },
  { key: "TECHNICAL_ISSUE", label: "App & Technical Error" },
  { key: "LISTING_REPORT", label: "Report Inaccurate Listing" },
  { key: "ACCOUNT_PRIVACY", label: "Account & Data Privacy" },
  { key: "GENERAL_INQUIRY", label: "General Concierge Question" },
];

export function SupportRequestScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    relatedEntityType?: "VISIT" | "INQUIRY" | "LISTING";
    relatedEntityId?: string;
  }>();

  const [category, setCategory] = useState<SupportCategory>(
    (params.category as SupportCategory) || "GENERAL_INQUIRY",
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicketRecord | null>(
    null,
  );

  const { submitTicket, isSubmitting, errors, submissionError, clearErrors } =
    useSubmitSupportTicket();

  useEffect(() => {
    trackEvent("support_flow_started", {
      category,
      hasRelatedEntity: Boolean(params.relatedEntityType),
    });
  }, []);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.SUPPORT as any);
    }
  }

  async function handleSubmit() {
    const dto: CreateSupportTicketDto = {
      category,
      subject,
      message,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    };

    const ticket = await submitTicket(dto);
    if (ticket) {
      setSubmittedTicket(ticket);
    }
  }

  return (
    <AppContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-surface"
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-surface border-b border-subtle-border">
          <View className="flex-row items-center space-x-3">
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="w-9 h-9 rounded-full bg-surface-muted items-center justify-center active:opacity-70 mr-2"
            >
              <Text variant="body" tone="primary" weight="bold">
                ←
              </Text>
            </Pressable>
            <View>
              <Text
                variant="label"
                tone="brand"
                weight="bold"
                className="tracking-widest uppercase text-[10px]"
              >
                DIRECT ASSISTANCE
              </Text>
              <Text variant="h2" tone="primary" weight="bold">
                Contact Concierge
              </Text>
            </View>
          </View>
        </View>

        {submittedTicket ? (
          /* Success Confirmation View */
          <ScrollView
            className="flex-1 px-5 pt-8"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <Card
              variant="outlined"
              padding="large"
              radius="large"
              style={{
                backgroundColor: "#F0FDF4",
                borderColor: "#BBF7D0",
              }}
            >
              <Stack spacing={4} className="items-center text-center">
                <Text className="text-4xl">✅</Text>
                <Stack spacing={1} className="items-center">
                  <Text variant="h3" tone="primary" weight="bold" className="text-center">
                    Request Received
                  </Text>
                  <Text variant="bodySmall" tone="secondary" className="text-center">
                    Your request has been submitted to the verified concierge team.
                  </Text>
                </Stack>

                <View className="w-full p-4 rounded-xl bg-surface border border-neutral-200">
                  <Stack spacing={2}>
                    <View className="flex-row justify-between">
                      <Text variant="caption" tone="muted">
                        Reference Number:
                      </Text>
                      <Text variant="caption" tone="brand" weight="bold">
                        {submittedTicket.ticketNumber}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text variant="caption" tone="muted">
                        Category:
                      </Text>
                      <Text variant="caption" tone="primary" weight="semibold">
                        {submittedTicket.category}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text variant="caption" tone="muted">
                        Status:
                      </Text>
                      <Text variant="caption" tone="success" weight="bold">
                        SUBMITTED
                      </Text>
                    </View>
                  </Stack>
                </View>

                <Button
                  label="Done"
                  variant="primary"
                  size="large"
                  onPress={handleBack}
                  fullWidth
                />
              </Stack>
            </Card>
          </ScrollView>
        ) : (
          /* Support Form View */
          <ScrollView
            className="flex-1 px-5 pt-5"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <Stack spacing={5}>
              {/* Category Picker */}
              <Stack spacing={2}>
                <Text variant="label" tone="secondary" weight="semibold">
                  Select Topic
                </Text>
                <View className="space-y-2">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = category === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => {
                          setCategory(opt.key);
                          clearErrors();
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        style={[
                          {
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 10,
                            borderWidth: 1,
                            backgroundColor: isSelected
                              ? colors.brand.light
                              : colors.surfaceMuted,
                            borderColor: isSelected
                              ? colors.brand.primary
                              : colors.defaultBorder,
                          },
                        ]}
                        className="mb-1.5"
                      >
                        <Text
                          variant="bodySmall"
                          tone={isSelected ? "brand" : "primary"}
                          weight={isSelected ? "bold" : "medium"}
                        >
                          {isSelected ? "● " : "○ "}
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.category && (
                  <Text variant="caption" tone="error">
                    {errors.category}
                  </Text>
                )}
              </Stack>

              {/* Subject Input */}
              <Stack spacing={1}>
                <View className="flex-row justify-between">
                  <Text variant="label" tone="secondary" weight="semibold">
                    Subject
                  </Text>
                  <Text variant="caption" tone="muted">
                    {subject.length}/100
                  </Text>
                </View>
                <TextInput
                  value={subject}
                  onChangeText={(val) => {
                    setSubject(val);
                    clearErrors();
                  }}
                  placeholder="Brief summary of your question"
                  placeholderTextColor={colors.mutedContent}
                  maxLength={100}
                  accessibilityLabel="Support subject"
                  style={{
                    backgroundColor: colors.surfaceMuted,
                    borderColor: errors.subject ? colors.error.DEFAULT : colors.defaultBorder,
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: colors.primaryContent,
                  }}
                />
                {errors.subject && (
                  <Text variant="caption" tone="error">
                    {errors.subject}
                  </Text>
                )}
              </Stack>

              {/* Message Input */}
              <Stack spacing={1}>
                <View className="flex-row justify-between">
                  <Text variant="label" tone="secondary" weight="semibold">
                    Details
                  </Text>
                  <Text variant="caption" tone="muted">
                    {message.length}/1000
                  </Text>
                </View>
                <TextInput
                  value={message}
                  onChangeText={(val) => {
                    setMessage(val);
                    clearErrors();
                  }}
                  placeholder="Provide any relevant context (e.g. preferred callback time, listing questions)..."
                  placeholderTextColor={colors.mutedContent}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={1000}
                  accessibilityLabel="Support details description"
                  style={{
                    backgroundColor: colors.surfaceMuted,
                    borderColor: errors.message ? colors.error.DEFAULT : colors.defaultBorder,
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    minHeight: 120,
                    color: colors.primaryContent,
                  }}
                />
                {errors.message && (
                  <Text variant="caption" tone="error">
                    {errors.message}
                  </Text>
                )}
              </Stack>

              {/* Related Entity Indicator if provided */}
              {params.relatedEntityType && (
                <View className="p-3 rounded-lg bg-neutral-100 border border-neutral-200">
                  <Text variant="caption" tone="muted">
                    Referencing:{" "}
                    <Text variant="caption" tone="primary" weight="bold">
                      {params.relatedEntityType} ({params.relatedEntityId?.slice(0, 8)}...)
                    </Text>
                  </Text>
                </View>
              )}

              {/* Submission Error Banner */}
              {submissionError && (
                <View className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <Text variant="caption" tone="error" weight="semibold">
                    {submissionError}
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <Box className="pt-2">
                <Button
                  label="Submit Request"
                  variant="primary"
                  size="large"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  loadingLabel="Submitting..."
                  fullWidth
                  accessibilityLabel="Submit support request"
                />
              </Box>
            </Stack>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </AppContainer>
  );
}
