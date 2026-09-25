import { CancellationRecord, CancellationStatus, RefundPaymentStatus } from "@/types/cancellation";
import { mulberry32, pick, randInt, daysAgoISO, fullName, CITIES, LOCALITIES } from "./seed";

const rng = mulberry32(9923);

export function generateMockCancellations(count = 16): CancellationRecord[] {
  const records: CancellationRecord[] = [];

  const statuses: CancellationStatus[] = [
    "requested",
    "under_review",
    "fee_pending",
    "payment_pending",
    "approved",
    "cancelled",
    "rejected",
  ];

  const userReasons = [
    "Purchaser personal loan approval declined by lender",
    "Family relocation cancelled due to corporate transfer policy shift",
    "Mutual disagreement regarding property hand-over timeline",
    "Purchaser found alternative property closer to workplace",
    "Physical inspection revealed undisclosed structural seepage",
  ];

  const brokerReasons = [
    "Seller retracted mandate due to higher off-market counter-offer",
    "Clear title deed could not be procured within statutory window",
    "Brokerage firm internal dispute over mandate exclusivity",
  ];

  for (let i = 0; i < count; i++) {
    const id = `CN-${(1040 + i).toString()}`;
    const dealId = `DL-${(84210 + i).toString()}`;
    const buyerName = fullName(rng);
    const brokerName = fullName(rng);
    const hasAgency = rng() > 0.45;
    const agencyName = hasAgency ? `${pick(rng, ["Prestige", "Brigade", "Sobha", "Skyline"])} Realty` : null;
    const isBrokerInitiated = i % 4 === 0;
    const city = pick(rng, CITIES);
    const locality = pick(rng, LOCALITIES[city] ?? ["Whitefield"]);
    const dealAmount = randInt(rng, 40, 160) * 100000; // ₹40 Lakhs to ₹1.6 Crore
    const feePercent = isBrokerInitiated ? 0 : pick(rng, [1.0, 1.25, 1.5, 1.75, 2.0]);
    const feeAmount = Math.round((dealAmount * feePercent) / 100);
    const brokerPenalty = isBrokerInitiated ? pick(rng, [15000, 25000, 50000]) : undefined;
    const paymentMode = i % 2 === 0 ? "platform_collected" : "external_transaction";
    const heldDeposit = paymentMode === "platform_collected" ? Math.round(dealAmount * 0.1) : 0;
    const status = pick(rng, statuses);

    let refundStatus: RefundPaymentStatus = "invoice_pending";
    if (paymentMode === "platform_collected") {
      refundStatus = status === "cancelled" || status === "approved" ? "auto_deducted" : "refund_processed";
    } else {
      refundStatus = status === "cancelled" || status === "approved" ? "invoice_paid" : "invoice_pending";
    }

    const requestedDaysAgo = randInt(rng, 2, 25);

    records.push({
      id,
      dealId,
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
      },
      agency: agencyName ? { id: `AGN-${(600 + i).toString()}`, name: agencyName } : null,
      property: {
        id: `PRP-${(70100 + i).toString()}`,
        title: `${pick(rng, ["Skyline Residency", "Green Valley Penthouse", "Palm Heights 3BHK", "Cyber Towers Office"])}`,
        locality,
        city,
      },
      dealAmount,
      initiatedBy: isBrokerInitiated ? (agencyName ? "agency" : "broker") : "buyer",
      reason: isBrokerInitiated ? pick(rng, brokerReasons) : pick(rng, userReasons),
      notes: "Cancellation requested post amount confirmation prior to external agreement execution.",
      requestedAt: daysAgoISO(rng, requestedDaysAgo),
      cancellationFeePercent: feePercent,
      cancellationFeeAmount: feeAmount,
      brokerPenaltyAmount: brokerPenalty,
      paymentMode,
      heldDepositAmount: heldDeposit,
      finalSettlementAmount: paymentMode === "platform_collected" ? heldDeposit - feeAmount : feeAmount,
      refundPaymentStatus: refundStatus,
      status,
      agreementStatusAtCancellation: "amount_confirmed_pre_agreement",
      invoiceNumber: paymentMode === "external_transaction" ? `INV-CN-${randInt(rng, 10000, 99999)}` : undefined,
      auditTrail: [
        {
          timestamp: daysAgoISO(rng, requestedDaysAgo),
          actor: isBrokerInitiated ? brokerName : buyerName,
          action: "Cancellation Request Initiated",
          notes: "Explicit cancellation confirmation received via platform portal.",
        },
        {
          timestamp: daysAgoISO(rng, requestedDaysAgo - 1),
          actor: "Platform Rules Engine",
          action: `Cancellation Fee Calculated (${feePercent}%)`,
          notes: `Calculated payable/deductible sum: ₹${feeAmount.toLocaleString("en-IN")}.`,
        },
        ...(status === "approved" || status === "cancelled"
          ? [
              {
                timestamp: daysAgoISO(rng, 1),
                actor: "Super Admin",
                action: "Cancellation Approved & Settled",
                notes: paymentMode === "platform_collected"
                  ? `Fee ₹${feeAmount.toLocaleString("en-IN")} auto-deducted from token deposit. Balance refunded.`
                  : `Formal cancellation invoice generated & dispatched to user.`,
              },
            ]
          : []),
      ],
    });
  }

  return records;
}

export const MOCK_CANCELLATIONS: CancellationRecord[] = generateMockCancellations(18);
