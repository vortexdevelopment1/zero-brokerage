import { AppUser, AppUserDetail, UserStatus, VerificationStatus, UserSubscriptionTier } from "@/types/user";
import { KycDocument, KycStatus, KycVerificationDetail } from "@/types/kyc";
import { mulberry32, pick, randInt, daysAgoISO, fullName, CITIES } from "./seed";

const STATUSES: UserStatus[] = ["active", "active", "active", "blocked", "pending"];
const VERIFICATIONS: VerificationStatus[] = ["verified", "verified", "pending", "unverified"];
const TIERS: UserSubscriptionTier[] = [
  "None", "Micro-Pass", "Starter", "Starter", "Pro Seeker", "Investor Pass", "VIP Concierge",
];

function generateUsers(count: number): AppUser[] {
  const rng = mulberry32(1001);
  const users: AppUser[] = [];
  for (let i = 0; i < count; i++) {
    const name = fullName(rng);
    const id = `USR-${(10000 + i).toString()}`;
    const verification = pick(rng, VERIFICATIONS);
    
    let kycStatus: KycStatus = "not_submitted";
    let kycDocuments: KycDocument[] = [];

    // Deterministic demo users covering all 4 KYC states
    if (i === 0) {
      kycStatus = "pending_review";
      kycDocuments = [
        {
          id: `DOC-${id}-AADHAAR`,
          type: "aadhaar",
          title: "Aadhaar Card",
          documentNumberMasked: "XXXX-XXXX-8910",
          status: "submitted",
          submittedAt: daysAgoISO(rng, 2),
          fileType: "image",
          fileSize: "1.8 MB",
          previewData: {
            issuer: "Unique Identification Authority of India (UIDAI)",
            holderName: name,
            validUntil: "Lifetime",
            watermarkText: "SPECIMEN DEMO - FOR VERIFICATION ONLY",
            details: {
              "Aadhaar Number": "XXXX-XXXX-8910",
              "Date of Birth": "14/05/1991",
              "Gender": "Male",
              "Address": "Flat 402, Green Glen Layout, Bellandur, Bengaluru - 560103",
              "Simulated Liveness": "Passed · Face Match 98.4%",
            },
          },
          notes: "Clear front color scan submitted via mobile capture.",
        },
        {
          id: `DOC-${id}-PAN`,
          type: "pan",
          title: "Permanent Account Number (PAN)",
          documentNumberMasked: "ABCDE1234F",
          status: "submitted",
          submittedAt: daysAgoISO(rng, 2),
          fileType: "image",
          fileSize: "1.2 MB",
          previewData: {
            issuer: "Income Tax Department, Govt. of India",
            holderName: name,
            validUntil: "Permanent",
            watermarkText: "SPECIMEN DEMO - NOT LEGAL TENDER",
            details: {
              "PAN": "ABCDE1234F",
              "Date of Birth": "14/05/1991",
              "Father's Name": "S. Sharma",
              "NSDL Verification": "Active & Valid (Simulated)",
            },
          },
          notes: "NSDL name matching score: 100%.",
        },
        {
          id: `DOC-${id}-PHOTO`,
          type: "profile_photo",
          title: "Live Identity Portrait",
          status: "submitted",
          submittedAt: daysAgoISO(rng, 2),
          fileType: "image",
          fileSize: "840 KB",
          previewData: {
            issuer: "VortexCubes Secure Onboarding Liveness Camera",
            holderName: name,
            watermarkText: "LIVENESS TIMESTAMPED 2026",
            details: {
              "Liveness Detection": "Passed (Anti-spoofing score 99.1%)",
              "Capture Mode": "Front-facing camera with random motion challenge",
            },
          },
          notes: "High-resolution selfie match with Aadhaar photograph.",
        },
      ];
    } else if (i === 1) {
      kycStatus = "verified";
      kycDocuments = [
        {
          id: `DOC-${id}-AADHAAR`,
          type: "aadhaar",
          title: "Aadhaar Card",
          documentNumberMasked: "XXXX-XXXX-4532",
          status: "approved",
          submittedAt: daysAgoISO(rng, 30),
          fileType: "image",
          fileSize: "2.1 MB",
          previewData: {
            issuer: "UIDAI",
            holderName: name,
            validUntil: "Lifetime",
            watermarkText: "VERIFIED ARCHIVE COPY",
            details: {
              "Aadhaar Number": "XXXX-XXXX-4532",
              "Date of Birth": "22/11/1988",
              "Gender": "Female",
              "Status": "Approved by Super Admin",
            },
          },
        },
        {
          id: `DOC-${id}-PAN`,
          type: "pan",
          title: "PAN Card",
          documentNumberMasked: "FGHIJ5678K",
          status: "approved",
          submittedAt: daysAgoISO(rng, 30),
          fileType: "image",
          fileSize: "1.4 MB",
          previewData: {
            issuer: "Income Tax Department",
            holderName: name,
            validUntil: "Permanent",
            watermarkText: "VERIFIED ARCHIVE COPY",
            details: {
              "PAN": "FGHIJ5678K",
              "Status": "Approved by Super Admin",
            },
          },
        },
      ];
    } else if (i === 2) {
      kycStatus = "rejected";
      kycDocuments = [
        {
          id: `DOC-${id}-AADHAAR`,
          type: "aadhaar",
          title: "Aadhaar Card",
          documentNumberMasked: "XXXX-XXXX-9901",
          status: "rejected",
          submittedAt: daysAgoISO(rng, 10),
          fileType: "image",
          fileSize: "920 KB",
          previewData: {
            issuer: "UIDAI",
            holderName: name,
            watermarkText: "REJECTED DEMO",
            details: {
              "Issue Identified": "Name spelling mismatch between Aadhaar and PAN",
            },
          },
        },
        {
          id: `DOC-${id}-PAN`,
          type: "pan",
          title: "PAN Card",
          documentNumberMasked: "KLMNO9012P",
          status: "rejected",
          submittedAt: daysAgoISO(rng, 10),
          fileType: "image",
          fileSize: "750 KB",
          previewData: {
            issuer: "Income Tax Department",
            holderName: name,
            watermarkText: "REJECTED DEMO",
            details: {
              "Issue Identified": "Details mismatch with registration credentials",
            },
          },
        },
      ];
    } else if (i === 3) {
      kycStatus = "not_submitted";
      kycDocuments = [];
    } else {
      // Fallback based on existing verification tag
      if (verification === "verified") {
        kycStatus = "verified";
        kycDocuments = [
          {
            id: `DOC-${id}-AADHAAR`,
            type: "aadhaar",
            title: "Aadhaar Card",
            documentNumberMasked: `XXXX-XXXX-${randInt(rng, 1000, 9999)}`,
            status: "approved",
            submittedAt: daysAgoISO(rng, 60),
            fileType: "image",
            fileSize: "1.5 MB",
          },
          {
            id: `DOC-${id}-PAN`,
            type: "pan",
            title: "PAN Card",
            documentNumberMasked: `ABCDE${randInt(rng, 1000, 9999)}F`,
            status: "approved",
            submittedAt: daysAgoISO(rng, 60),
            fileType: "image",
            fileSize: "1.1 MB",
          },
        ];
      } else if (verification === "pending") {
        kycStatus = "pending_review";
        kycDocuments = [
          {
            id: `DOC-${id}-AADHAAR`,
            type: "aadhaar",
            title: "Aadhaar Card",
            documentNumberMasked: `XXXX-XXXX-${randInt(rng, 1000, 9999)}`,
            status: "submitted",
            submittedAt: daysAgoISO(rng, 3),
            fileType: "image",
            fileSize: "1.6 MB",
          },
          {
            id: `DOC-${id}-PAN`,
            type: "pan",
            title: "PAN Card",
            documentNumberMasked: `ABCDE${randInt(rng, 1000, 9999)}Z`,
            status: "submitted",
            submittedAt: daysAgoISO(rng, 3),
            fileType: "image",
            fileSize: "1.2 MB",
          },
        ];
      } else {
        kycStatus = "not_submitted";
        kycDocuments = [];
      }
    }

    users.push({
      id,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}${i}@mailbox.com`,
      phone: `+91 9${randInt(rng, 100000000, 999999999)}`,
      avatarSeed: id,
      verification: kycStatus === "verified" ? "verified" : kycStatus === "pending_review" ? "pending" : "unverified",
      subscription: pick(rng, TIERS),
      status: pick(rng, STATUSES),
      city: pick(rng, CITIES),
      createdAt: daysAgoISO(rng, 420),
      kycStatus,
      kycDocuments,
    });
  }
  return users;
}

export const MOCK_USERS: AppUser[] = generateUsers(186);

const USER_KYC_STORE = new Map<string, KycVerificationDetail>();

export function getMockUserKyc(userId: string): KycVerificationDetail | null {
  if (USER_KYC_STORE.has(userId)) {
    return USER_KYC_STORE.get(userId)!;
  }

  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) return null;

  const detail: KycVerificationDetail = {
    id: `KYC-${user.id}`,
    entityId: user.id,
    entityType: "user",
    fullName: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    status: user.kycStatus ?? "not_submitted",
    submittedAt: user.kycDocuments && user.kycDocuments.length > 0 ? user.kycDocuments[0].submittedAt : undefined,
    reviewedAt: user.kycStatus === "verified" || user.kycStatus === "rejected" ? user.createdAt : undefined,
    reviewedBy: user.kycStatus === "verified" || user.kycStatus === "rejected" ? "Super Admin (Compliance Ops)" : undefined,
    rejectionReason: user.id === "USR-10002" ? "Details mismatch" : undefined,
    rejectionComments: user.id === "USR-10002" ? "The name on Aadhaar does not match the PAN card application." : undefined,
    documents: user.kycDocuments ? [...user.kycDocuments] : [],
  };

  USER_KYC_STORE.set(userId, detail);
  return detail;
}

export function updateMockUserKycStatus(
  userId: string,
  newStatus: KycStatus,
  reason?: string,
  comments?: string
): KycVerificationDetail | null {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) return null;

  user.kycStatus = newStatus;
  if (newStatus === "verified") {
    user.verification = "verified";
  }

  let kycDetail = USER_KYC_STORE.get(userId);
  if (!kycDetail) {
    kycDetail = getMockUserKyc(userId)!;
  }

  const now = new Date().toISOString();
  kycDetail.status = newStatus;
  kycDetail.reviewedAt = now;
  kycDetail.reviewedBy = "Super Admin (You)";

  if (newStatus === "rejected") {
    kycDetail.rejectionReason = reason ?? "Other";
    kycDetail.rejectionComments = comments;
    kycDetail.documents = kycDetail.documents.map((d) => ({ ...d, status: "rejected" as const }));
  } else if (newStatus === "verified") {
    kycDetail.rejectionReason = undefined;
    kycDetail.rejectionComments = undefined;
    kycDetail.documents = kycDetail.documents.map((d) => ({ ...d, status: "approved" as const }));
  }

  user.kycDocuments = kycDetail.documents;
  USER_KYC_STORE.set(userId, kycDetail);
  return kycDetail;
}

export function getMockUserDetail(id: string): AppUserDetail | null {
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) return null;
  const rng = mulberry32(id.length * 7919 + 3);
  return {
    ...user,
    activity: {
      searches: randInt(rng, 3, 240),
      savedProperties: randInt(rng, 0, 24),
      ownerContactsUsed: randInt(rng, 0, 15),
      lastActiveAt: daysAgoISO(rng, 14),
    },
    visits: Array.from({ length: randInt(rng, 0, 5) }, (_, i) => ({
      id: `VST-${id}-${i}`,
      property: pick(rng, ["Skyline Residency 3BHK", "Palm Grove Villa", "Cedar Business Park", "Green Acres Farmland"]),
      scheduledAt: daysAgoISO(rng, 90),
      status: pick(rng, ["Completed", "Scheduled", "Cancelled", "Rescheduled"]),
    })),
    transactions: Array.from({ length: randInt(rng, 0, 4) }, (_, i) => ({
      id: `TXN-${id}-${i}`,
      type: pick(rng, ["Subscription", "Micro-Transaction"]),
      amount: pick(rng, [29, 199, 499, 5, 10, 999]),
      status: pick(rng, ["Success", "Pending", "Failed"]),
      date: daysAgoISO(rng, 200),
    })),
  };
}
