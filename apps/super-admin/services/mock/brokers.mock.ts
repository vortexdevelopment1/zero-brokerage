import { Broker, BrokerDetail, BrokerStatus } from "@/types/broker";
import { KycDocument, KycStatus, KycVerificationDetail } from "@/types/kyc";
import { mulberry32, pick, randInt, randFloat, daysAgoISO, fullName, CITIES } from "./seed";
import { MOCK_AGENCIES } from "./agencies.mock";

const VERIFICATIONS: BrokerStatus[] = ["verified", "verified", "verified", "pending", "suspended", "rejected"];

function generateBrokers(count: number): Broker[] {
  const rng = mulberry32(2002);
  const brokers: Broker[] = [];
  for (let i = 0; i < count; i++) {
    const name = fullName(rng);
    const id = `BRK-${(5000 + i).toString()}`;
    const verification = pick(rng, VERIFICATIONS);
    const agency = rng() > 0.4 ? pick(rng, MOCK_AGENCIES).name : null;

    let kycStatus: KycStatus = "not_submitted";
    let kycDocuments: KycDocument[] = [];

    // Deterministic demo brokers covering all 4 KYC states
    if (i === 0) {
      kycStatus = "pending_review";
      kycDocuments = [
        {
          id: `DOC-${id}-RERA`,
          type: "rera_certificate",
          title: "RERA Agent Registration Certificate",
          documentNumberMasked: "PRM/KA/RERA/1251/310/PR/2026/0091",
          status: "submitted",
          submittedAt: daysAgoISO(rng, 3),
          fileType: "pdf",
          fileSize: "2.4 MB",
          previewData: {
            issuer: "Real Estate Regulatory Authority (RERA), Govt. of Karnataka",
            holderName: name,
            validUntil: "31/12/2029",
            watermarkText: "RERA OFFICIAL ARCHIVE SPECIMEN",
            details: {
              "RERA Registration No": "PRM/KA/RERA/1251/310/PR/2026/0091",
              "Agent Category": "Individual Registered Facilitator",
              "District": "Bengaluru Urban",
              "QR Verification": "Signed Cryptographic RERA Seal (Simulated)",
            },
          },
          notes: "Official certificate signed by RERA Competent Authority.",
        },
        {
          id: `DOC-${id}-PAN`,
          type: "business_pan",
          title: "Broker Commercial PAN Card",
          documentNumberMasked: "BKRPN4321A",
          status: "submitted",
          submittedAt: daysAgoISO(rng, 3),
          fileType: "image",
          fileSize: "1.1 MB",
          previewData: {
            issuer: "Income Tax Department",
            holderName: name,
            validUntil: "Permanent",
            watermarkText: "SPECIMEN DEMO - FOR VERIFICATION",
            details: {
              "PAN": "BKRPN4321A",
              "Category": "Individual Business Proprietary",
            },
          },
        },
        {
          id: `DOC-${id}-AADHAAR`,
          type: "aadhaar",
          title: "Identity Proof (Aadhaar)",
          documentNumberMasked: "XXXX-XXXX-6721",
          status: "submitted",
          submittedAt: daysAgoISO(rng, 3),
          fileType: "image",
          fileSize: "1.7 MB",
          previewData: {
            issuer: "UIDAI",
            holderName: name,
            validUntil: "Lifetime",
            watermarkText: "SPECIMEN DEMO",
            details: {
              "Aadhaar Number": "XXXX-XXXX-6721",
              "City": "Bengaluru",
            },
          },
        },
      ];
    } else if (i === 1) {
      kycStatus = "verified";
      kycDocuments = [
        {
          id: `DOC-${id}-RERA`,
          type: "rera_certificate",
          title: "RERA Agent Registration Certificate",
          documentNumberMasked: "PRM/MH/RERA/2025/1102",
          status: "approved",
          submittedAt: daysAgoISO(rng, 45),
          fileType: "pdf",
          fileSize: "2.8 MB",
          previewData: {
            issuer: "MahaRERA",
            holderName: name,
            validUntil: "15/06/2030",
            watermarkText: "VERIFIED ARCHIVE COPY",
            details: {
              "RERA Registration No": "PRM/MH/RERA/2025/1102",
              "Status": "Approved by Compliance Team",
            },
          },
        },
        {
          id: `DOC-${id}-PAN`,
          type: "business_pan",
          title: "Broker Commercial PAN Card",
          documentNumberMasked: "BKRPN9988C",
          status: "approved",
          submittedAt: daysAgoISO(rng, 45),
          fileType: "image",
          fileSize: "1.3 MB",
        },
      ];
    } else if (i === 2) {
      kycStatus = "rejected";
      kycDocuments = [
        {
          id: `DOC-${id}-RERA`,
          type: "rera_certificate",
          title: "RERA Agent Registration Certificate",
          documentNumberMasked: "PRM/DL/RERA/2024/0021",
          status: "rejected",
          submittedAt: daysAgoISO(rng, 8),
          fileType: "pdf",
          fileSize: "980 KB",
          previewData: {
            issuer: "Delhi RERA",
            holderName: name,
            watermarkText: "REJECTED DEMO",
            details: {
              "Reason": "Document scan is blurry and bottom stamp is cropped.",
            },
          },
        },
      ];
    } else if (i === 3) {
      kycStatus = "not_submitted";
      kycDocuments = [];
    } else {
      if (verification === "verified") {
        kycStatus = "verified";
        kycDocuments = [
          {
            id: `DOC-${id}-RERA`,
            type: "rera_certificate",
            title: "RERA Agent Registration Certificate",
            documentNumberMasked: `PRM/RERA/2025/${randInt(rng, 1000, 9999)}`,
            status: "approved",
            submittedAt: daysAgoISO(rng, 70),
            fileType: "pdf",
            fileSize: "2.2 MB",
          },
          {
            id: `DOC-${id}-PAN`,
            type: "business_pan",
            title: "Broker Commercial PAN Card",
            documentNumberMasked: `BKRPN${randInt(rng, 1000, 9999)}X`,
            status: "approved",
            submittedAt: daysAgoISO(rng, 70),
            fileType: "image",
            fileSize: "1.2 MB",
          },
        ];
      } else if (verification === "pending") {
        kycStatus = "pending_review";
        kycDocuments = [
          {
            id: `DOC-${id}-RERA`,
            type: "rera_certificate",
            title: "RERA Agent Registration Certificate",
            documentNumberMasked: `PRM/RERA/2026/${randInt(rng, 1000, 9999)}`,
            status: "submitted",
            submittedAt: daysAgoISO(rng, 4),
            fileType: "pdf",
            fileSize: "2.1 MB",
          },
          {
            id: `DOC-${id}-PAN`,
            type: "business_pan",
            title: "Broker Commercial PAN Card",
            documentNumberMasked: `BKRPN${randInt(rng, 1000, 9999)}Y`,
            status: "submitted",
            submittedAt: daysAgoISO(rng, 4),
            fileType: "image",
            fileSize: "1.0 MB",
          },
        ];
      } else if (verification === "rejected") {
        kycStatus = "rejected";
        kycDocuments = [
          {
            id: `DOC-${id}-RERA`,
            type: "rera_certificate",
            title: "RERA Agent Registration Certificate",
            documentNumberMasked: `PRM/RERA/2025/${randInt(rng, 1000, 9999)}`,
            status: "rejected",
            submittedAt: daysAgoISO(rng, 12),
            fileType: "pdf",
            fileSize: "1.1 MB",
          },
        ];
      } else {
        kycStatus = "not_submitted";
        kycDocuments = [];
      }
    }

    brokers.push({
      id,
      name,
      agency,
      phone: `+91 8${randInt(rng, 100000000, 999999999)}`,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}${i}@broker.vortexcubes.com`,
      rating: randFloat(rng, 3, 5, 1),
      propertiesListed: randInt(rng, 2, 140),
      closures: randInt(rng, 0, 48),
      verification: kycStatus === "verified" ? "verified" : kycStatus === "pending_review" ? "pending" : kycStatus === "rejected" ? "rejected" : "pending",
      status: verification === "suspended" ? "suspended" : "active",
      createdAt: daysAgoISO(rng, 500),
      city: pick(rng, CITIES),
      kycStatus,
      kycDocuments,
    });
  }
  return brokers;
}

export const MOCK_BROKERS: Broker[] = generateBrokers(94);

const BROKER_KYC_STORE = new Map<string, KycVerificationDetail>();

export function getMockBrokerKyc(brokerId: string): KycVerificationDetail | null {
  if (BROKER_KYC_STORE.has(brokerId)) {
    return BROKER_KYC_STORE.get(brokerId)!;
  }

  const broker = MOCK_BROKERS.find((b) => b.id === brokerId);
  if (!broker) return null;

  const detail: KycVerificationDetail = {
    id: `KYC-${broker.id}`,
    entityId: broker.id,
    entityType: "broker",
    fullName: broker.name,
    email: broker.email,
    phone: broker.phone,
    city: broker.city,
    agency: broker.agency,
    status: broker.kycStatus ?? "not_submitted",
    submittedAt: broker.kycDocuments && broker.kycDocuments.length > 0 ? broker.kycDocuments[0].submittedAt : undefined,
    reviewedAt: broker.kycStatus === "verified" || broker.kycStatus === "rejected" ? broker.createdAt : undefined,
    reviewedBy: broker.kycStatus === "verified" || broker.kycStatus === "rejected" ? "Super Admin (Compliance Ops)" : undefined,
    rejectionReason: broker.id === "BRK-5002" ? "Document unclear" : undefined,
    rejectionComments: broker.id === "BRK-5002" ? "The uploaded RERA certificate scan is illegible and cutoff at the bottom." : undefined,
    documents: broker.kycDocuments ? [...broker.kycDocuments] : [],
  };

  BROKER_KYC_STORE.set(brokerId, detail);
  return detail;
}

export function updateMockBrokerKycStatus(
  brokerId: string,
  newStatus: KycStatus,
  reason?: string,
  comments?: string
): KycVerificationDetail | null {
  const broker = MOCK_BROKERS.find((b) => b.id === brokerId);
  if (!broker) return null;

  broker.kycStatus = newStatus;
  if (newStatus === "verified") {
    broker.verification = "verified";
  } else if (newStatus === "rejected") {
    broker.verification = "rejected";
  }

  let kycDetail = BROKER_KYC_STORE.get(brokerId);
  if (!kycDetail) {
    kycDetail = getMockBrokerKyc(brokerId)!;
  }

  const now = new Date().toISOString();
  kycDetail.status = newStatus;
  kycDetail.reviewedAt = now;
  kycDetail.reviewedBy = "Super Admin (You)";

  if (newStatus === "rejected") {
    kycDetail.rejectionReason = reason ?? "Document unclear";
    kycDetail.rejectionComments = comments;
    kycDetail.documents = kycDetail.documents.map((d) => ({ ...d, status: "rejected" as const }));
  } else if (newStatus === "verified") {
    kycDetail.rejectionReason = undefined;
    kycDetail.rejectionComments = undefined;
    kycDetail.documents = kycDetail.documents.map((d) => ({ ...d, status: "approved" as const }));
  }

  broker.kycDocuments = kycDetail.documents;
  BROKER_KYC_STORE.set(brokerId, kycDetail);
  return kycDetail;
}

export function getMockBrokerDetail(id: string): BrokerDetail | null {
  const broker = MOCK_BROKERS.find((b) => b.id === id);
  if (!broker) return null;
  const rng = mulberry32(id.length * 5051 + 7);
  const rankScore =
    (broker.verification === "verified" ? 1 : 0.4) * 0.4 +
    (broker.rating / 5) * 0.3 +
    Math.min(broker.closures / 50, 1) * 0.3;
  return {
    ...broker,
    rankScore: Math.round(rankScore * 100) / 100,
    reviews: Array.from({ length: randInt(rng, 0, 6) }, (_, i) => ({
      id: `REV-${id}-${i}`,
      reviewer: fullName(rng),
      rating: randInt(rng, 3, 5),
      comment: pick(rng, [
        "Very responsive and showed the property on time.",
        "Helped negotiate a fair deal quickly.",
        "Knowledgeable about the locality and paperwork.",
        "Rescheduled once but was professional throughout.",
        "Excellent follow-up after the site visit.",
      ]),
      date: daysAgoISO(rng, 240),
    })),
    recentListings: Array.from({ length: randInt(rng, 1, 6) }, (_, i) => ({
      id: `PRP-${id}-${i}`,
      title: pick(rng, [
        "2BHK Skyline Residency", "Bare-shell Office, Hitech City", "Agricultural Land Parcel",
        "3BHK Palm Grove Villa", "Retail Showroom, MG Road", "Co-working Suite",
      ]),
      status: pick(rng, ["Approved", "Pending", "Deal Done", "Not Available"]),
    })),
  };
}
