import { Deal, DealLifecycleStage, AgreementStatus, AgreementReviewStatus } from "@/types/deal";
import { mulberry32, pick, randInt, daysAgoISO, fullName, CITIES, LOCALITIES } from "./seed";

const rng = mulberry32(7712);

function generateSpecimenAgreement(
  id: string,
  party: "user" | "broker",
  buyerName: string,
  brokerName: string,
  propertyTitle: string,
  amount: number,
  status: "pending" | "approved" | "rejected" | "changes_requested",
  daysAgo: number,
  hasMismatch = false
) {
  return {
    id: `AGR-${party.toUpperCase()}-${id}`,
    party,
    title: `${party === "user" ? "Buyer" : "Broker"} Executed Agreement - ${propertyTitle}`,
    documentNumberMasked: `KA-BLR-${party === "user" ? "BYR" : "BRK"}-${randInt(rng, 10000, 99999)}`,
    uploadedAt: daysAgoISO(rng, daysAgo),
    fileSize: `${randInt(rng, 18, 48) / 10} MB`,
    fileType: "pdf" as const,
    status,
    specimenData: {
      parties: {
        firstParty: `${brokerName} (Licensed Broker / Authorized Property Rep)`,
        secondParty: `${buyerName} (Purchaser / Tenant)`,
      },
      dealAmount: hasMismatch && party === "user" ? amount + 250000 : amount,
      propertyDetails: `${propertyTitle}, Prime Zone, Bengaluru`,
      executionDate: new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0],
      place: "Bengaluru, Karnataka",
      signatures: {
        firstPartySigned: true,
        secondPartySigned: !hasMismatch || party === "broker",
        stampAffixed: true,
      },
      watermark: "EXTERNAL LEGAL SPECIMEN",
    },
    notes: hasMismatch
      ? "Discrepancy noted in second-party signature and stated valuation vs platform record."
      : undefined,
  };
}

export function generateMockDeals(count = 25): Deal[] {
  const deals: Deal[] = [];

  const stageVariations: Array<{
    stage: DealLifecycleStage;
    status: Deal["status"];
    agreementStatus: AgreementStatus;
    reviewStatus: AgreementReviewStatus;
  }> = [
    { stage: "NEGOTIATION", status: "negotiation", agreementStatus: "pending", reviewStatus: "not_required" as any },
    { stage: "DEAL_INITIATED", status: "deal_initiated", agreementStatus: "pending", reviewStatus: "not_required" as any },
    { stage: "AMOUNT_CONFIRMED", status: "amount_confirmed", agreementStatus: "pending", reviewStatus: "not_required" as any },
    { stage: "AGREEMENT_PENDING", status: "agreement_pending", agreementStatus: "pending", reviewStatus: "pending_review" },
    { stage: "AGREEMENT_UPLOADED_BY_USER", status: "agreement_pending", agreementStatus: "user_uploaded", reviewStatus: "pending_review" },
    { stage: "AGREEMENT_UPLOADED_BY_BROKER", status: "agreement_pending", agreementStatus: "broker_uploaded", reviewStatus: "pending_review" },
    { stage: "AGREEMENT_PENDING", status: "agreement_pending", agreementStatus: "both_uploaded", reviewStatus: "pending_review" },
    { stage: "AGREEMENT_PENDING", status: "agreement_pending", agreementStatus: "mismatch_flagged", reviewStatus: "changes_requested" },
    { stage: "AGREEMENT_COMPLETED", status: "agreement_completed", agreementStatus: "completed", reviewStatus: "approved" },
    { stage: "DEAL_DONE", status: "deal_done", agreementStatus: "completed", reviewStatus: "completed" },
    { stage: "DEAL_CANCELLED", status: "cancelled", agreementStatus: "pending", reviewStatus: "rejected" },
  ];

  for (let i = 0; i < count; i++) {
    const variant = stageVariations[i % stageVariations.length];
    const dealId = `DL-${(84200 + i).toString()}`;
    const buyerName = fullName(rng);
    const brokerName = fullName(rng);
    const hasAgency = rng() > 0.4;
    const agencyName = hasAgency ? `${pick(rng, ["Prestige", "Sobha", "Brigade", "Godrej", "Skyline"])} Realty Partners` : null;
    const city = pick(rng, CITIES);
    const locality = pick(rng, LOCALITIES[city] ?? ["Indiranagar"]);
    const dealAmount = randInt(rng, 35, 180) * 100000; // ₹35 Lakhs to ₹1.8 Crore
    const paymentMode = i % 2 === 0 ? "platform_collected" : "external_transaction";
    const heldDeposit = paymentMode === "platform_collected" ? Math.round(dealAmount * 0.1) : 0; // 10% token deposit

    const hasUserUpload = [
      "AGREEMENT_UPLOADED_BY_USER",
      "both_uploaded",
      "mismatch_flagged",
      "completed",
    ].includes(variant.agreementStatus) || variant.stage === "AGREEMENT_COMPLETED" || variant.stage === "DEAL_DONE";

    const hasBrokerUpload = [
      "AGREEMENT_UPLOADED_BY_BROKER",
      "both_uploaded",
      "mismatch_flagged",
      "completed",
    ].includes(variant.agreementStatus) || variant.stage === "AGREEMENT_COMPLETED" || variant.stage === "DEAL_DONE";

    const isMismatch = variant.agreementStatus === "mismatch_flagged";
    const propertyTitle = `${pick(rng, ["Skyline Residency", "Green Valley Luxury Penthouse", "Palm Grove 3BHK", "Cyber Heights Bare-shell Office", "Meridian Corporate Tower"])}`;

    const userAgreement = hasUserUpload
      ? generateSpecimenAgreement(
          dealId,
          "user",
          buyerName,
          brokerName,
          propertyTitle,
          dealAmount,
          isMismatch ? "changes_requested" : variant.reviewStatus === "approved" || variant.stage === "DEAL_DONE" ? "approved" : "pending",
          randInt(rng, 3, 10),
          isMismatch
        )
      : undefined;

    const brokerAgreement = hasBrokerUpload
      ? generateSpecimenAgreement(
          dealId,
          "broker",
          buyerName,
          brokerName,
          propertyTitle,
          dealAmount,
          variant.reviewStatus === "approved" || variant.stage === "DEAL_DONE" ? "approved" : "pending",
          randInt(rng, 1, 5)
        )
      : undefined;

    const createdDaysAgo = randInt(rng, 15, 60);

    deals.push({
      id: dealId,
      buyer: {
        id: `USR-${(10200 + i).toString()}`,
        name: buyerName,
        email: `${buyerName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        phone: `+91 98${randInt(rng, 10000000, 99999999)}`,
      },
      broker: {
        id: `BRK-${(40200 + i).toString()}`,
        name: brokerName,
        phone: `+91 97${randInt(rng, 10000000, 99999999)}`,
        license: `RERA-KA-${randInt(rng, 2018, 2024)}-${randInt(rng, 1000, 9999)}`,
      },
      agency: agencyName ? { id: `AGN-${(600 + i).toString()}`, name: agencyName } : null,
      property: {
        id: `PRP-${(70100 + i).toString()}`,
        title: propertyTitle,
        category: i % 3 === 0 ? "commercial" : "residential",
        subtype: i % 3 === 0 ? "Bare-shell Office" : "Luxury Apartment",
        city,
        locality,
        price: dealAmount,
      },
      dealAmount,
      paymentMode,
      heldDepositAmount: heldDeposit,
      stage: variant.stage,
      status: variant.status,
      agreementStatus: variant.agreementStatus,
      reviewStatus: variant.reviewStatus,
      userAgreement,
      brokerAgreement,
      mismatchReason: isMismatch
        ? "Stated consideration amount in Buyer document (₹" + (dealAmount + 250000).toLocaleString("en-IN") + ") mismatches confirmed platform amount (₹" + dealAmount.toLocaleString("en-IN") + ")."
        : undefined,
      cancellationId: variant.stage === "DEAL_CANCELLED" ? `CN-${(1040 + i).toString()}` : undefined,
      createdAt: daysAgoISO(rng, createdDaysAgo),
      updatedAt: daysAgoISO(rng, randInt(rng, 0, 5)),
      auditTimeline: [
        {
          id: `AUD-1-${dealId}`,
          stage: "NEGOTIATION",
          timestamp: daysAgoISO(rng, createdDaysAgo),
          actor: buyerName,
          role: "Buyer",
          description: "Initiated negotiation request after property site inspection.",
          status: "completed",
        },
        {
          id: `AUD-2-${dealId}`,
          stage: "DEAL_INITIATED",
          timestamp: daysAgoISO(rng, createdDaysAgo - 2),
          actor: brokerName,
          role: "Broker",
          description: "Proceeded with deal proposal and initiated closing terms.",
          status: "completed",
        },
        {
          id: `AUD-3-${dealId}`,
          stage: "AMOUNT_CONFIRMED",
          timestamp: daysAgoISO(rng, createdDaysAgo - 4),
          actor: "Platform Multi-Party Verifier",
          role: "System",
          description: `Mutual agreement on final consideration value: ₹${dealAmount.toLocaleString("en-IN")}.`,
          status: variant.stage === "DEAL_INITIATED" ? "pending" : "completed",
        },
        ...(hasUserUpload
          ? [
              {
                id: `AUD-4-${dealId}`,
                stage: "AGREEMENT_UPLOADED_BY_USER",
                timestamp: userAgreement?.uploadedAt ?? daysAgoISO(rng, 5),
                actor: buyerName,
                role: "Buyer" as const,
                description: "Uploaded externally executed legal agreement copy (PDF).",
                status: "completed" as const,
              },
            ]
          : []),
        ...(hasBrokerUpload
          ? [
              {
                id: `AUD-5-${dealId}`,
                stage: "AGREEMENT_UPLOADED_BY_BROKER",
                timestamp: brokerAgreement?.uploadedAt ?? daysAgoISO(rng, 3),
                actor: brokerName,
                role: "Broker" as const,
                description: "Uploaded counter-signed legal agreement copy with notary seals.",
                status: "completed" as const,
              },
            ]
          : []),
        ...(variant.stage === "AGREEMENT_COMPLETED" || variant.stage === "DEAL_DONE"
          ? [
              {
                id: `AUD-6-${dealId}`,
                stage: "AGREEMENT_COMPLETED",
                timestamp: daysAgoISO(rng, 2),
                actor: "Super Admin",
                role: "Super Admin" as const,
                description: "Administrative verification approved: Both parties uploaded consistent documents.",
                status: "completed" as const,
              },
            ]
          : []),
        ...(variant.stage === "DEAL_DONE"
          ? [
              {
                id: `AUD-7-${dealId}`,
                stage: "DEAL_DONE",
                timestamp: daysAgoISO(rng, 1),
                actor: "Super Admin",
                role: "Super Admin" as const,
                description: "Deal marked Completed. Property removed from active marketplace search per SOW.",
                status: "completed" as const,
              },
            ]
          : []),
        ...(variant.stage === "DEAL_CANCELLED"
          ? [
              {
                id: `AUD-CAN-${dealId}`,
                stage: "DEAL_CANCELLED",
                timestamp: daysAgoISO(rng, 1),
                actor: "Super Admin",
                role: "Super Admin" as const,
                description: "Deal officially cancelled. Cancellation fee deducted/invoiced in audit log.",
                status: "completed" as const,
              },
            ]
          : []),
      ],
    });
  }

  return deals;
}

export const MOCK_DEALS: Deal[] = generateMockDeals(28);
