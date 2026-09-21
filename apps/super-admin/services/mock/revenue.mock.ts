import {
  CommissionEntry, SubscriptionEntry, MicroTransactionEntry, TransactionEntry,
  PayoutStatus, DealStatus, PaymentStatus, TransactionType,
} from "@/types/revenue";
import { mulberry32, pick, randInt, daysAgoISO, fullName } from "./seed";
import { MOCK_PROPERTIES } from "./properties.mock";

const PAYOUT: PayoutStatus[] = ["pending", "processing", "paid", "paid", "failed"];
const DEAL: DealStatus[] = ["in-progress", "closed", "closed", "cancelled"];
const PAYMENT: PaymentStatus[] = ["success", "success", "success", "pending", "failed", "refunded"];

function generateCommissions(count: number): CommissionEntry[] {
  const rng = mulberry32(6006);
  const out: CommissionEntry[] = [];
  for (let i = 0; i < count; i++) {
    const property = pick(rng, MOCK_PROPERTIES.filter((p) => p.category !== "furniture"));
    const isLuxury = property.isLuxury;
    const dealValue = property.price;
    const rate = isLuxury ? 0 : randInt(rng, 10, 20) / 10;
    out.push({
      id: `COM-${(1000 + i).toString()}`,
      dealId: `DEAL-${(5000 + i).toString()}`,
      property: property.title,
      broker: fullName(rng),
      dealValue,
      commissionRate: rate,
      platformCommission: Math.round((dealValue * rate) / 100),
      isLuxury,
      dealStatus: pick(rng, DEAL),
      payoutStatus: isLuxury ? "paid" : pick(rng, PAYOUT),
      date: daysAgoISO(rng, 180),
    });
  }
  return out;
}

export const MOCK_COMMISSIONS: CommissionEntry[] = generateCommissions(120);

const USER_PLANS = [
  { plan: "Micro-Pass", price: 29 },
  { plan: "Starter", price: 199 },
  { plan: "Pro Seeker", price: 499 },
  { plan: "Investor Pass", price: 999 },
  { plan: "VIP Concierge", price: 1499 },
];
const AGENCY_PLANS = [
  { plan: "Silver Partner", price: 1999 },
  { plan: "Gold Agency", price: 4999 },
  { plan: "Platinum Builder", price: 9999 },
];

function generateSubscriptions(count: number): SubscriptionEntry[] {
  const rng = mulberry32(7007);
  const out: SubscriptionEntry[] = [];
  for (let i = 0; i < count; i++) {
    const isAgency = rng() > 0.7;
    const planInfo = isAgency ? pick(rng, AGENCY_PLANS) : pick(rng, USER_PLANS);
    const purchase = daysAgoISO(rng, 340);
    const expiry = new Date(purchase);
    expiry.setDate(expiry.getDate() + 30);
    const status = expiry.getTime() < Date.now() ? "expired" : "active";
    out.push({
      id: `SUB-${(2000 + i).toString()}`,
      audience: isAgency ? "agency" : "user",
      plan: planInfo.plan,
      subscriber: isAgency ? `${pick(rng, ["Skyline", "Horizon", "Evergreen"])} Estates` : fullName(rng),
      revenue: planInfo.price,
      status,
      purchaseDate: purchase,
      expiryDate: expiry.toISOString(),
      paymentStatus: pick(rng, PAYMENT),
    });
  }
  return out;
}

export const MOCK_SUBSCRIPTIONS: SubscriptionEntry[] = generateSubscriptions(210);

function generateMicroTransactions(count: number): MicroTransactionEntry[] {
  const rng = mulberry32(8008);
  const out: MicroTransactionEntry[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `MTX-${(3000 + i).toString()}`,
      user: fullName(rng),
      alertType: pick(rng, ["WhatsApp", "SMS"]),
      amount: pick(rng, [5, 7, 10]),
      paymentStatus: pick(rng, PAYMENT),
      date: daysAgoISO(rng, 90),
    });
  }
  return out;
}

export const MOCK_MICRO_TRANSACTIONS: MicroTransactionEntry[] = generateMicroTransactions(260);

const TXN_TYPES: TransactionType[] = ["subscription", "commission-payout", "micro-transaction", "refund"];

function generateTransactions(count: number): TransactionEntry[] {
  const rng = mulberry32(9009);
  const out: TransactionEntry[] = [];
  for (let i = 0; i < count; i++) {
    const type = pick(rng, TXN_TYPES);
    const amount =
      type === "subscription" ? pick(rng, [29, 199, 499, 999, 1499, 1999, 4999, 9999]) :
      type === "micro-transaction" ? pick(rng, [5, 7, 10]) :
      randInt(rng, 2000, 480000);
    out.push({
      id: `TXN-${(4000 + i).toString()}`,
      entity: fullName(rng),
      type,
      amount,
      status: pick(rng, PAYMENT),
      gateway: pick(rng, ["Razorpay", "Stripe"]),
      date: daysAgoISO(rng, 240),
    });
  }
  return out;
}

export const MOCK_TRANSACTIONS: TransactionEntry[] = generateTransactions(300);
