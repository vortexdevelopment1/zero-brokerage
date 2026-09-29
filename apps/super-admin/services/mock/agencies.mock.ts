import {
  Agency,
  AgencyDetail,
  AgencyPlan,
  AgencyStatus,
  AgencyBrokerMember,
  AgencyKycDocument,
} from "@/types/agency";
import { mulberry32, pick, randInt, daysAgoISO, fullName, CITIES } from "./seed";

const PLANS: AgencyPlan[] = ["Silver Partner", "Gold Agency", "Platinum Builder"];
const STATUSES: AgencyStatus[] = ["active", "active", "active", "pending", "suspended"];
const PLAN_CAPACITY: Record<AgencyPlan, { listings: number; seats: number; boost: number }> = {
  "Silver Partner": { listings: 50, seats: 2, boost: 0 },
  "Gold Agency": { listings: 200, seats: 10, boost: 10 },
  "Platinum Builder": { listings: 5000, seats: 50, boost: 25 },
};

const AGENCY_WORDS = [
  "Skyline", "Horizon", "Evergreen", "Pinnacle", "Meridian", "Cedar", "Northgate", "Silverline",
  "Golden", "Harbor", "Crescent", "Summit", "Vantage", "Elevate", "Bluewave", "Regency",
];
const AGENCY_SUFFIX = ["Estates", "Realty", "Properties", "Builders", "Developers", "Homes", "Group"];

function generateAgencies(count: number): Agency[] {
  const rng = mulberry32(3003);
  const agencies: Agency[] = [];
  for (let i = 0; i < count; i++) {
    const plan = pick(rng, PLANS);
    const cap = PLAN_CAPACITY[plan];
    const name = `${pick(rng, AGENCY_WORDS)} ${pick(rng, AGENCY_SUFFIX)}`;
    const status = pick(rng, STATUSES);

    agencies.push({
      id: `AGY-${(3000 + i).toString()}`,
      name: `${name} ${i + 1}`,
      owner: fullName(rng),
      plan,
      brokers: randInt(rng, 1, cap.seats),
      activeListings: randInt(rng, 0, Math.min(cap.listings, 320)),
      status,
      city: pick(rng, CITIES),
      createdAt: daysAgoISO(rng, 600),
    });
  }
  return agencies;
}

export const MOCK_AGENCIES: Agency[] = generateAgencies(52);

// In-memory store for detail updates across simulated requests
const AGENCY_STORE = new Map<string, AgencyDetail>();

export function getMockAgencyDetail(id: string): AgencyDetail | null {
  if (AGENCY_STORE.has(id)) {
    return AGENCY_STORE.get(id)!;
  }

  const agency = MOCK_AGENCIES.find((a) => a.id === id);
  if (!agency) return null;

  const rng = mulberry32(id.length * 4111 + 11);
  const cap = PLAN_CAPACITY[agency.plan];
  const numId = parseInt(id.replace(/\D/g, ""), 10) || 3000;
  const isApproved = agency.status === "active" || agency.status === "suspended";
  const isRejected = agency.status === "rejected";

  const boostRemaining = agency.plan === "Gold Agency" ? 5 : agency.plan === "Platinum Builder" ? 12 : 0;

  // The 3 Agency KYC documents: GST Certificate, Owner PAN, Owner Aadhaar
  const gstNumber = `29AABCZ${(numId * 3).toString().padStart(4, "0").slice(0, 4)}F1Z5`;
  const panNumber = `AABCZ${(numId * 2).toString().padStart(4, "0").slice(0, 4)}P`;
  const aadhaarNumber = `XXXX-XXXX-${(numId % 8999 + 1000)}`;

  const docStatus = isApproved ? "approved" : isRejected ? "rejected" : "submitted";

  const kycDocuments: AgencyKycDocument[] = [
    {
      id: `DOC-GST-${id}`,
      type: "gst_certificate",
      title: "Company GST Certificate (REG-06)",
      documentNumberMasked: gstNumber,
      status: docStatus,
      submittedAt: daysAgoISO(rng, 45),
      fileSize: "2.4 MB",
      fileType: "pdf",
      previewData: {
        holderName: agency.name,
        issuer: "Goods and Services Tax Network",
        watermarkText: "GOVT OF INDIA · GST SPECIMEN",
        details: {
          "GSTIN": gstNumber,
          "Legal Name": agency.name,
          "Trade Name": agency.name,
          "State Jurisdiction": "Karnataka",
          "Address": `${agency.city}, Karnataka, India`,
        },
      },
      notes: "Principal registration document for commercial real estate brokerage operations.",
    },
    {
      id: `DOC-PAN-${id}`,
      type: "business_pan",
      title: "Agency Owner PAN Card",
      documentNumberMasked: panNumber,
      status: docStatus,
      submittedAt: daysAgoISO(rng, 45),
      fileSize: "1.1 MB",
      fileType: "image",
      previewData: {
        holderName: agency.owner,
        issuer: "Income Tax Department, Govt of India",
        watermarkText: "SPECIMEN COPY · VERIFIED PAN",
        details: {
          "PAN Number": panNumber,
          "Holder": agency.owner,
          "Category": "Individual / Proprietor",
        },
      },
      notes: "Identity and income tax verification of primary business proprietor.",
    },
    {
      id: `DOC-AADHAAR-${id}`,
      type: "aadhaar",
      title: "Agency Owner Aadhaar Card",
      documentNumberMasked: aadhaarNumber,
      status: docStatus,
      submittedAt: daysAgoISO(rng, 45),
      fileSize: "1.6 MB",
      fileType: "image",
      previewData: {
        holderName: agency.owner,
        issuer: "UIDAI",
        watermarkText: "UIDAI SPECIMEN · MASKED IDENTIFIER",
        details: {
          "Aadhaar Number": aadhaarNumber,
          "Name": agency.owner,
          "Address": `${agency.city}, India`,
        },
      },
      notes: "Masked identity proof with anti-spoofing verification.",
    },
  ];

  const brokerTeam: AgencyBrokerMember[] = Array.from({ length: agency.brokers }, (_, i) => {
    const brokerName = fullName(rng);
    const brokerPhone = `+91 9${randInt(rng, 100000000, 999999999)}`;
    const brokerClosures = randInt(rng, 2, 28);
    const brokerRating = parseFloat((4.0 + (rng() * 0.9)).toFixed(1));
    return {
      id: `BRK-${id}-${i + 1}`,
      name: brokerName,
      closures: brokerClosures,
      phone: brokerPhone,
      email: `${brokerName.toLowerCase().replace(/\s+/g, ".")}@${agency.name.toLowerCase().replace(/\s+/g, "")}.com`,
      status: "active",
      rating: brokerRating,
      propertiesListed: randInt(rng, 3, 24),
    };
  });

  const detail: AgencyDetail = {
    ...agency,
    email: `contact@${agency.name.toLowerCase().replace(/\s+/g, "")}.com`,
    phone: `+91 7${randInt(rng, 100000000, 999999999)}`,
    seatsUsed: agency.brokers,
    seatsAllowed: cap.seats,
    boostCredits: boostRemaining,
    brokerTeam,
    kycDocuments,
    rejectionReason: isRejected ? "GST Certificate expired / blurred scan" : undefined,
    rejectionComments: isRejected ? "The uploaded GST certificate was illegible and principal place of business differed from registration records." : undefined,
    reviewedAt: isApproved || isRejected ? daysAgoISO(rng, 25) : undefined,
    reviewedBy: isApproved || isRejected ? "Super Admin (Compliance Ops)" : undefined,
  };

  AGENCY_STORE.set(id, detail);
  return detail;
}

export function updateMockAgencyStatus(
  id: string,
  newStatus: AgencyStatus,
  reason?: string
): AgencyDetail | null {
  const agency = MOCK_AGENCIES.find((a) => a.id === id);
  if (!agency) return null;

  agency.status = newStatus;
  const detail = getMockAgencyDetail(id);
  if (detail) {
    detail.status = newStatus;
    if (newStatus === "active") {
      detail.kycDocuments?.forEach((d) => (d.status = "approved"));
    } else if (newStatus === "rejected") {
      detail.rejectionReason = reason;
      detail.kycDocuments?.forEach((d) => (d.status = "rejected"));
    }
    AGENCY_STORE.set(id, detail);
  }
  return detail;
}

export function approveMockAgency(id: string): AgencyDetail | null {
  const agency = MOCK_AGENCIES.find((a) => a.id === id);
  if (!agency) return null;

  agency.status = "active";
  const detail = getMockAgencyDetail(id);
  if (detail) {
    detail.status = "active";
    detail.reviewedAt = new Date().toISOString();
    detail.reviewedBy = "Super Admin (You)";
    detail.rejectionReason = undefined;
    detail.rejectionComments = undefined;
    if (detail.kycDocuments) {
      detail.kycDocuments = detail.kycDocuments.map((d) => ({ ...d, status: "approved" }));
    }
    AGENCY_STORE.set(id, detail);
  }
  return detail;
}

export function rejectMockAgency(id: string, reason?: string, comments?: string): AgencyDetail | null {
  const agency = MOCK_AGENCIES.find((a) => a.id === id);
  if (!agency) return null;

  agency.status = "rejected";
  const detail = getMockAgencyDetail(id);
  if (detail) {
    detail.status = "rejected";
    detail.reviewedAt = new Date().toISOString();
    detail.reviewedBy = "Super Admin (You)";
    detail.rejectionReason = reason ?? "Compliance criteria not met";
    detail.rejectionComments = comments;
    if (detail.kycDocuments) {
      detail.kycDocuments = detail.kycDocuments.map((d) => ({ ...d, status: "rejected" }));
    }
    AGENCY_STORE.set(id, detail);
  }
  return detail;
}
