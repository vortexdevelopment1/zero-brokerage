/**
 * Zero Brokerage User Mobile — Furniture Domain Fixtures (Step 8)
 *
 * Provides high-fidelity fixture catalogue and deterministic in-memory order store.
 * Conforms strictly to Step 8 Blueprint:
 * - Real RFC 4122 UUID identifiers
 * - Explicit separation of Individual vs Package items
 * - Explicit separation of Rental vs Purchase options
 * - Server/adapter-authoritative pricing calculations
 */

import type {
  CheckoutIntentItemInput,
  CheckoutSummaryLineItem,
  CheckoutSummaryResponse,
  CreateFurnitureOrderInput,
  FurnitureAsset,
  FurnitureCatalogFilterParams,
  FurnitureCatalogResponse,
  FurnitureOrder,
  FurnitureOrderLineItem,
  FurnitureOrderListResponse,
  RequestFurnitureReturnInput,
} from "../types/furniture.types";

export const FIXTURE_FURNITURE_CATALOG: readonly FurnitureAsset[] = [
  // ── 1. Individual Assets ──
  {
    id: "f0000001-1111-4000-8000-000000000001",
    name: "AeroPro Ergonomic Task Chair",
    slug: "aeropro-ergonomic-task-chair",
    category: "SEATING",
    type: "INDIVIDUAL",
    description:
      "Engineered for 12+ hour commercial workdays. Breathable high-tension elastomeric mesh, 4D adjustable armrests, synchronized multi-tilt mechanism, and dynamic pneumatic lumbar support.",
    images: [
      "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 999,
    salePrice: 18500,
    depositAmount: 1999,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 3,
    availability: "IN_STOCK",
    availableQuantity: 120,
    dimensions: { widthCm: 68, depthCm: 65, heightCm: 118 },
    materials: ["Recycled Polyamide Frame", "BIFMA Level 3 Mesh", "Aluminum Base"],
    specifications: {
      "Weight Capacity": "140 kg",
      "Armrest Adjustability": "4D (Height, Width, Depth, Angle)",
      "Recline Range": "90° to 135°",
      Certification: "BIFMA X5.1 / Greenguard Gold",
    },
    deliveryEstimateDays: 2,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 36,
    variants: [
      { id: "var-aeropro-graphite", name: "Graphite Black", sku: "AERO-BLK", isAvailable: true },
      { id: "var-aeropro-mineral", name: "Mineral Gray", sku: "AERO-GRY", isAvailable: true },
      { id: "var-aeropro-cobalt", name: "Deep Cobalt", sku: "AERO-CBT", isAvailable: false },
    ],
    cancellationPolicy: "Free cancellation prior to delivery dispatch. 100% refund of deposit and advance rent.",
    returnPolicy: "Eligible for return with 15-day advance notice after minimum 3-month rental tenure.",
    isFeatured: true,
  },
  {
    id: "f0000002-2222-4000-8000-000000000002",
    name: "Architectural Dual-Motor Sit-Stand Desk",
    slug: "architectural-dual-motor-sit-stand-desk",
    category: "WORKSTATION",
    type: "INDIVIDUAL",
    description:
      "Ultra-quiet dual motor lifting column with smart 4-position memory controller, solid oak chamfered tabletop, integrated wire tray, and anti-collision optical safety sensors.",
    images: [
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 1499,
    salePrice: 32000,
    depositAmount: 2999,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 3,
    availability: "IN_STOCK",
    availableQuantity: 85,
    dimensions: { widthCm: 150, depthCm: 75, heightCm: 125 },
    materials: ["FSC Certified White Oak", "Cold-Rolled Carbon Steel Frame"],
    specifications: {
      "Lifting Speed": "38 mm/s",
      "Sound Level": "< 45 dB",
      "Weight Capacity": "125 kg",
      "Height Range": "62 cm to 127 cm",
    },
    deliveryEstimateDays: 3,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 60,
    variants: [
      { id: "var-desk-oak", name: "Natural Oak / Black Frame", sku: "DESK-OAK-BLK", isAvailable: true },
      { id: "var-desk-walnut", name: "Smoked Walnut / White Frame", sku: "DESK-WLN-WHT", isAvailable: true },
    ],
    cancellationPolicy: "Free cancellation up to 24 hours prior to scheduled installation.",
    returnPolicy: "Free uninstallation and pickup with 15-day notice post minimum rental period.",
    isFeatured: true,
  },
  {
    id: "f0000003-3333-4000-8000-000000000003",
    name: "Nordic Acoustic 10-Seater Conference Table",
    slug: "nordic-acoustic-10-seater-conference-table",
    category: "CONFERENCE",
    type: "INDIVIDUAL",
    description:
      "Commanding 3.2-meter meeting table with integrated dual pop-up motorized power boxes (HDMI, USB-C 100W PD, Universal Sockets), chamfered walnut veneer, and cable spine.",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 4200,
    salePrice: 95000,
    depositAmount: 8500,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 6,
    availability: "IN_STOCK",
    availableQuantity: 18,
    dimensions: { widthCm: 320, depthCm: 120, heightCm: 76 },
    materials: ["Walnut Hardwood Veneer", "Powder-Coated Cast Steel Base"],
    specifications: {
      Seating: "10 to 12 executives",
      Connectivity: "2x Motorized Flip Boxes (4x USB-C, 4x AC, 2x HDMI, 2x RJ45)",
      "Surface Resistance": "Scratch & Liquid Repellent Nano Coating",
    },
    deliveryEstimateDays: 4,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 36,
    cancellationPolicy: "Custom setup cancellation permitted up to 48 hours prior to dispatch.",
    returnPolicy: "Professional white-glove disassembly and transit included on authorized return.",
  },
  {
    id: "f0000004-4444-4000-8000-000000000004",
    name: "Verona Bouclé Reception Lounge Chair",
    slug: "verona-boucle-reception-lounge-chair",
    category: "LOUNGE",
    type: "INDIVIDUAL",
    description:
      "Sculptural welcoming silhouette for commercial reception zones, executive suites, and casual collaboration hubs. Heavyweight stain-resistant bouclé textile with satin bronze legs.",
    images: [
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 1200,
    salePrice: 26000,
    depositAmount: 2400,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 3,
    availability: "IN_STOCK",
    availableQuantity: 40,
    dimensions: { widthCm: 84, depthCm: 80, heightCm: 78 },
    materials: ["Stain-Resistant Wool Bouclé", "Solid Hardwood Inner Structure", "Satin Bronze Legs"],
    deliveryEstimateDays: 2,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 24,
    cancellationPolicy: "Standard free cancellation prior to dispatch.",
    returnPolicy: "Eligible for scheduled pickup with 15-day notice.",
  },
  {
    id: "f0000005-5555-4000-8000-000000000005",
    name: "Apex Modular Acoustic Storage Credenza",
    slug: "apex-modular-acoustic-storage-credenza",
    category: "STORAGE",
    type: "INDIVIDUAL",
    description:
      "Quiet-damped soft-close acoustic felt sliding panels with dual lockable steel drawers, adjustable shelving, and integrated planter trough top.",
    images: [
      "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 799,
    salePrice: 14500,
    depositAmount: 1500,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 3,
    availability: "IN_STOCK",
    availableQuantity: 65,
    dimensions: { widthCm: 160, depthCm: 45, heightCm: 85 },
    materials: ["Recycled PET Acoustic Felt", "Commercial Powder-Coated Sheet Steel"],
    deliveryEstimateDays: 3,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 24,
    cancellationPolicy: "Standard free cancellation prior to delivery dispatch.",
    returnPolicy: "15-day advance notice return supported.",
  },
  {
    id: "f0000006-6666-4000-8000-000000000006",
    name: "Mayfair Executive Handcrafted Leather Armchair",
    slug: "mayfair-executive-handcrafted-leather-armchair",
    category: "EXECUTIVE",
    type: "INDIVIDUAL",
    description:
      "Top-grain semi-aniline Italian leather with hand-stitched detailing, knee-tilt synchronized mechanism, brushed gunmetal 5-star castor base, and integrated memory-foam headrest.",
    images: [
      "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 2100,
    salePrice: 45000,
    depositAmount: 4200,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 3,
    availability: "IN_STOCK",
    availableQuantity: 25,
    dimensions: { widthCm: 72, depthCm: 70, heightCm: 128 },
    materials: ["Italian Top-Grain Leather", "Die-Cast Aluminum Frame"],
    deliveryEstimateDays: 2,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 60,
    cancellationPolicy: "Free cancellation prior to delivery dispatch.",
    returnPolicy: "15-day notice post minimum rental period.",
  },

  // ── 2. Packaged Turnkey Office Setups ──
  {
    id: "f0000007-7777-4000-8000-000000000007",
    name: "50-Workstation Turnkey Growth Hub",
    slug: "50-workstation-turnkey-growth-hub",
    category: "WORKSTATION",
    type: "PACKAGE",
    description:
      "Complete plug-and-play setup for 50 knowledge workers. Includes dual-motor electric sit-stand desks, AeroPro ergonomic mesh chairs, acoustic desktop dividers, heavy-duty under-desk cable management trays, and dual universal power blocks.",
    images: [
      "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1000&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 75000,
    salePrice: 1250000,
    depositAmount: 150000,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 6,
    availability: "IN_STOCK",
    availableQuantity: 8,
    packageCapacity: 50,
    packageIncludedItems: [
      { name: "Motorized Dual-Motor Oak Desks (150x75cm)", quantity: 50, category: "Workstation" },
      { name: "AeroPro Ergonomic High-Back Chairs", quantity: 50, category: "Seating" },
      { name: "Acoustic Felt Privacy Dividers", quantity: 50, category: "Acoustics" },
      { name: "Dual-Port Pop-Up Power & High-Speed USB Modules", quantity: 50, category: "Power & Data" },
      { name: "Under-Desk Steel Cable Spines", quantity: 50, category: "Accessories" },
    ],
    deliveryEstimateDays: 5,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 36,
    cancellationPolicy: "Turnkey package orders can be modified or cancelled up to 5 business days before scheduled deployment.",
    returnPolicy: "Turnkey returns require 30-day formal notice. Full onsite disassembly and logistics handled by Zero Brokerage technicians.",
    isFeatured: true,
  },
  {
    id: "f0000008-8888-4000-8000-000000000008",
    name: "Executive Boardroom Turnkey Suite",
    slug: "executive-boardroom-turnkey-suite",
    category: "CONFERENCE",
    type: "PACKAGE",
    description:
      "All-inclusive presentation-ready commercial conference suite. Includes 14-person walnut conference table with automated cable retractor hub, 14 Mayfair leather chairs, acoustic wall credenza, and presentation hospitality bar.",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 22000,
    salePrice: 380000,
    depositAmount: 45000,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 6,
    availability: "IN_STOCK",
    availableQuantity: 12,
    packageCapacity: 14,
    packageIncludedItems: [
      { name: "Nordic Walnut 14-Person Conference Table (3.6m)", quantity: 1, category: "Conference" },
      { name: "Mayfair Executive Leather Chairs", quantity: 14, category: "Seating" },
      { name: "Telepresence Acoustic Credenza with AV Mount", quantity: 1, category: "Storage" },
      { name: "Hospitality Bar & Coffee Station Credenza", quantity: 1, category: "Pantry" },
    ],
    deliveryEstimateDays: 4,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 36,
    cancellationPolicy: "Cancellation permitted up to 3 days prior to scheduled installation.",
    returnPolicy: "White-glove disassembly and transit included with 30-day notice.",
  },
  {
    id: "f0000009-9999-4000-8000-000000000009",
    name: "Creative Studio Collaboration Pod",
    slug: "creative-studio-collaboration-pod",
    category: "LOUNGE",
    type: "PACKAGE",
    description:
      "Agile open-plan studio suite. Combines 4 mobile acoustic whiteboard walls, 6 Verona bouclé lounge chairs, 2 solid oak low coffee tables, and 4 modular phone-booth acoustic seats for quiet sprints.",
    images: [
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1000&q=80&auto=format&fit=crop",
    ],
    availableModes: ["RENTAL", "SALE"],
    rentPerPeriod: 16500,
    salePrice: 280000,
    depositAmount: 32000,
    rentalFrequency: "MONTHLY",
    minRentalMonths: 3,
    availability: "IN_STOCK",
    availableQuantity: 15,
    packageCapacity: 12,
    packageIncludedItems: [
      { name: "Verona Bouclé Lounge Armchairs", quantity: 6, category: "Lounge" },
      { name: "Mobile Double-Sided Magnetic Whiteboard Screens", quantity: 4, category: "Collaboration" },
      { name: "Solid Oak Round Low Tables", quantity: 2, category: "Tables" },
      { name: "Acoustic Solo Phone-Booth Focus Chairs", quantity: 2, category: "Privacy" },
    ],
    deliveryEstimateDays: 3,
    serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    warrantyMonths: 24,
    cancellationPolicy: "Standard free cancellation prior to dispatch.",
    returnPolicy: "30-day notice return supported.",
  },
];

// Initial user orders for testing & offline evaluation
export const INITIAL_FIXTURE_ORDERS: readonly FurnitureOrder[] = [
  {
    id: "00000001-0000-4000-8000-000000000001",
    orderNumber: "ZB-FURN-2026-0018",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "RENTAL",
    status: "ACTIVE_RENTAL",
    paymentStatus: "COMPLETED",
    deliveryStatus: "DELIVERED",
    totalDueNow: 225000,
    recurringRentPerPeriod: 75000,
    securityDeposit: 150000,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000007-7777-4000-8000-000000000007",
        assetName: "50-Workstation Turnkey Growth Hub",
        coverImageUrl:
          "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "RENTAL",
        unitPriceOrRent: 75000,
        subtotal: 75000,
        depositSubtotal: 150000,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 4, Tech Park East",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    trackingNumber: "ZB-LOG-882194",
    estimatedDeliveryDate: "2026-09-15T10:00:00.000Z",
    deliveredAt: "2026-09-15T14:30:00.000Z",
    activeRentalStartDate: "2026-09-15T14:30:00.000Z",
    nextRenewalDate: "2026-11-15T00:00:00.000Z",
    rentalDurationMonths: 12,
    canCancel: false,
    canRequestReturn: true,
    claimStatus: "NONE",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-15T14:30:00.000Z",
  },
  {
    id: "00000002-0000-4000-8000-000000000002",
    orderNumber: "ZB-FURN-2026-0042",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "SALE",
    status: "CONFIRMED",
    paymentStatus: "COMPLETED",
    deliveryStatus: "OUT_FOR_DELIVERY",
    totalDueNow: 50500,
    recurringRentPerPeriod: 0,
    securityDeposit: 0,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000001-1111-4000-8000-000000000001",
        assetName: "AeroPro Ergonomic Task Chair",
        coverImageUrl:
          "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "SALE",
        unitPriceOrRent: 18500,
        subtotal: 18500,
        depositSubtotal: 0,
      },
      {
        assetId: "f0000002-2222-4000-8000-000000000002",
        assetName: "Architectural Dual-Motor Sit-Stand Desk",
        coverImageUrl:
          "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "SALE",
        unitPriceOrRent: 32000,
        subtotal: 32000,
        depositSubtotal: 0,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 4, Tech Park East",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    trackingNumber: "ZB-LOG-994102",
    estimatedDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    canCancel: true,
    canRequestReturn: false,
    claimStatus: "NONE",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "00000003-0000-4000-8000-000000000003",
    orderNumber: "ZB-FURN-2026-0031",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "RENTAL",
    status: "RETURN_REQUESTED",
    paymentStatus: "COMPLETED",
    deliveryStatus: "DELIVERED",
    totalDueNow: 3600,
    recurringRentPerPeriod: 1200,
    securityDeposit: 2400,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000004-4444-4000-8000-000000000004",
        assetName: "Verona Bouclé Reception Lounge Chair",
        coverImageUrl:
          "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "RENTAL",
        unitPriceOrRent: 1200,
        subtotal: 1200,
        depositSubtotal: 2400,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Penthouse 4, Worli Sea Face",
      locality: "Worli",
      city: "Mumbai",
      pincode: "400030",
    },
    estimatedDeliveryDate: "2026-07-01T10:00:00.000Z",
    deliveredAt: "2026-07-01T12:00:00.000Z",
    activeRentalStartDate: "2026-07-01T12:00:00.000Z",
    canCancel: false,
    canRequestReturn: false,
    returnRequestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    returnScheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    returnStatus: "SCHEDULED",
    claimStatus: "NONE",
    createdAt: "2026-06-25T11:00:00.000Z",
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "00000004-0000-4000-8000-000000000004",
    orderNumber: "ZB-FURN-2026-0050",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "RENTAL",
    status: "PAYMENT_PENDING",
    paymentStatus: "PENDING",
    deliveryStatus: "PENDING",
    totalDueNow: 4998,
    recurringRentPerPeriod: 999,
    securityDeposit: 3998,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000001-1111-4000-8000-000000000001",
        assetName: "AeroPro Ergonomic Task Chair",
        coverImageUrl:
          "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=800&q=80&auto=format&fit=crop",
        quantity: 2,
        mode: "RENTAL",
        unitPriceOrRent: 999,
        subtotal: 1998,
        depositSubtotal: 3998,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 4, Tech Park East",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    canCancel: true,
    canRequestReturn: false,
    claimStatus: "NONE",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "00000005-0000-4000-8000-000000000005",
    orderNumber: "ZB-FURN-2026-0051",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "SALE",
    status: "FAILED",
    paymentStatus: "FAILED",
    deliveryStatus: "FAILED",
    totalDueNow: 32000,
    recurringRentPerPeriod: 0,
    securityDeposit: 0,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000002-2222-4000-8000-000000000002",
        assetName: "Architectural Dual-Motor Sit-Stand Desk",
        coverImageUrl:
          "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "SALE",
        unitPriceOrRent: 32000,
        subtotal: 32000,
        depositSubtotal: 0,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 4, Tech Park East",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    canCancel: false,
    canRequestReturn: false,
    claimStatus: "NONE",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "00000006-0000-4000-8000-000000000006",
    orderNumber: "ZB-FURN-2026-0052",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "SALE",
    status: "REQUESTED",
    paymentStatus: "ACTION_REQUIRED",
    deliveryStatus: "PENDING",
    totalDueNow: 18500,
    recurringRentPerPeriod: 0,
    securityDeposit: 0,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000001-1111-4000-8000-000000000001",
        assetName: "AeroPro Ergonomic Task Chair",
        coverImageUrl:
          "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "SALE",
        unitPriceOrRent: 18500,
        subtotal: 18500,
        depositSubtotal: 0,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 4, Tech Park East",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    estimatedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    canCancel: true,
    canRequestReturn: false,
    claimStatus: "NONE",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "00000007-0000-4000-8000-000000000007",
    orderNumber: "ZB-FURN-2026-0020",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "SALE",
    status: "CANCELLED",
    paymentStatus: "CANCELLED",
    deliveryStatus: "FAILED",
    totalDueNow: 18500,
    recurringRentPerPeriod: 0,
    securityDeposit: 0,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000001-1111-4000-8000-000000000001",
        assetName: "AeroPro Ergonomic Task Chair",
        coverImageUrl:
          "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "SALE",
        unitPriceOrRent: 18500,
        subtotal: 18500,
        depositSubtotal: 0,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 4, Tech Park East",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    estimatedDeliveryDate: "2026-05-10T10:00:00.000Z",
    canCancel: false,
    cancellationReason: "Client chose different office location",
    canRequestReturn: false,
    claimStatus: "NONE",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-02T12:00:00.000Z",
  },
  {
    id: "00000008-0000-4000-8000-000000000008",
    orderNumber: "ZB-FURN-2026-0010",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "SALE",
    status: "COMPLETED",
    paymentStatus: "COMPLETED",
    deliveryStatus: "DELIVERED",
    totalDueNow: 32000,
    recurringRentPerPeriod: 0,
    securityDeposit: 0,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000002-2222-4000-8000-000000000002",
        assetName: "Architectural Dual-Motor Sit-Stand Desk",
        coverImageUrl:
          "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "SALE",
        unitPriceOrRent: 32000,
        subtotal: 32000,
        depositSubtotal: 0,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 4, Tech Park East",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    estimatedDeliveryDate: "2026-04-10T10:00:00.000Z",
    deliveredAt: "2026-04-10T15:00:00.000Z",
    canCancel: false,
    canRequestReturn: false,
    claimStatus: "NONE",
    createdAt: "2026-04-05T10:00:00.000Z",
    updatedAt: "2026-04-10T15:00:00.000Z",
  },
  {
    id: "00000009-0000-4000-8000-000000000009",
    orderNumber: "ZB-FURN-2026-0008",
    userId: "fixture-user-00000000-0000-4000-8000-000000000001",
    mode: "RENTAL",
    status: "CLAIM_UNDER_REVIEW",
    paymentStatus: "COMPLETED",
    deliveryStatus: "DELIVERED",
    totalDueNow: 3600,
    recurringRentPerPeriod: 1200,
    securityDeposit: 2400,
    deliveryFee: 0,
    taxes: 0,
    items: [
      {
        assetId: "f0000004-4444-4000-8000-000000000004",
        assetName: "Verona Bouclé Reception Lounge Chair",
        coverImageUrl:
          "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80&auto=format&fit=crop",
        quantity: 1,
        mode: "RENTAL",
        unitPriceOrRent: 1200,
        subtotal: 1200,
        depositSubtotal: 2400,
      },
    ],
    deliveryAddress: {
      fullName: "Akshay Verma",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 4, Tech Park East",
      locality: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    estimatedDeliveryDate: "2026-03-01T10:00:00.000Z",
    deliveredAt: "2026-03-01T16:00:00.000Z",
    activeRentalStartDate: "2026-03-01T16:00:00.000Z",
    canCancel: false,
    canRequestReturn: false,
    claimStatus: "SUBMITTED",
    claimDescription: "Surface fabric tear upon delivery inspection.",
    createdAt: "2026-02-25T10:00:00.000Z",
    updatedAt: "2026-03-02T10:00:00.000Z",
  },
];

/**
 * Deterministic In-Memory Furniture Store for Step 8
 */
export class FixtureFurnitureStore {
  private catalog: FurnitureAsset[] = [...FIXTURE_FURNITURE_CATALOG];
  private orders: Map<string, FurnitureOrder> = new Map(
    INITIAL_FIXTURE_ORDERS.map((o) => [o.id, { ...o }]),
  );

  reset(): void {
    this.catalog = [...FIXTURE_FURNITURE_CATALOG];
    this.orders = new Map(
      INITIAL_FIXTURE_ORDERS.map((o) => [o.id, { ...o }]),
    );
  }

  getCatalog(filters?: FurnitureCatalogFilterParams): FurnitureCatalogResponse {
    let result = [...this.catalog];

    if (filters?.query) {
      const q = filters.query.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.materials && item.materials.some((m) => m.toLowerCase().includes(q))),
      );
    }

    if (filters?.category && filters.category !== "ALL") {
      result = result.filter((item) => item.category === filters.category);
    }

    if (filters?.type && filters.type !== "ALL") {
      result = result.filter((item) => item.type === filters.type);
    }

    if (filters?.mode && filters.mode !== "ALL") {
      result = result.filter((item) => item.availableModes.includes(filters.mode as any));
    }

    if (filters?.city && filters.city !== "All Locations" && filters.city !== "ALL") {
      const c = filters.city.toLowerCase();
      result = result.filter((item) =>
        item.serviceableCities.some((city) => city.toLowerCase().includes(c)),
      );
    }

    if (filters?.inStockOnly) {
      result = result.filter((item) => item.availability === "IN_STOCK");
    }

    const categoriesMap: Record<string, number> = {};
    for (const item of this.catalog) {
      categoriesMap[item.category] = (categoriesMap[item.category] || 0) + 1;
    }

    const categories = Object.entries(categoriesMap).map(([cat, count]) => ({
      id: cat as any,
      label: cat.charAt(0) + cat.slice(1).toLowerCase(),
      count,
    }));

    return {
      items: result,
      total: result.length,
      categories,
      serviceableCities: ["Bengaluru", "Mumbai", "Hyderabad", "New Delhi", "Pune"],
    };
  }

  getAssetById(id: string): FurnitureAsset | null {
    const sanitizedId = id.trim();
    return this.catalog.find((item) => item.id === sanitizedId || item.slug === sanitizedId) || null;
  }

  calculateCheckoutSummary(items: readonly CheckoutIntentItemInput[]): CheckoutSummaryResponse {
    let oneTimeCharges = 0;
    let recurringRentPerPeriod = 0;
    let securityDeposit = 0;
    const deliveryFee = 0; // Free commercial transit for Step 8 launch
    const lineItems: CheckoutSummaryLineItem[] = [];

    for (const input of items) {
      const asset = this.getAssetById(input.assetId);
      if (!asset) {
        throw new Error(`Furniture item not found: ${input.assetId}`);
      }

      const variant = input.variantId
        ? asset.variants?.find((v) => v.id === input.variantId)
        : undefined;

      let unitPriceOrRent = 0;
      let depositSubtotal = 0;
      let subtotal = 0;

      if (input.mode === "RENTAL") {
        unitPriceOrRent = asset.rentPerPeriod ?? 0;
        subtotal = unitPriceOrRent * input.quantity;
        depositSubtotal = (asset.depositAmount ?? 0) * input.quantity;
        recurringRentPerPeriod += subtotal;
        securityDeposit += depositSubtotal;
      } else {
        unitPriceOrRent = asset.salePrice ?? 0;
        subtotal = unitPriceOrRent * input.quantity;
        oneTimeCharges += subtotal;
      }

      lineItems.push({
        assetId: asset.id,
        assetName: asset.name,
        coverImageUrl: asset.images[0] || "",
        variantName: variant?.name,
        mode: input.mode,
        quantity: input.quantity,
        unitPriceOrRent,
        subtotal,
        depositSubtotal,
      });
    }

    const totalDueNow = oneTimeCharges + recurringRentPerPeriod + securityDeposit + deliveryFee;
    const futureRecurringAmount = recurringRentPerPeriod;

    return {
      items: lineItems,
      oneTimeCharges,
      recurringRentPerPeriod,
      rentalFrequency: "MONTHLY",
      securityDeposit,
      deliveryFee,
      taxes: 0, // Transparent inclusive pricing
      totalDueNow,
      futureRecurringAmount,
      nextBillingDate:
        recurringRentPerPeriod > 0
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      estimatedDeliveryDays: 3,
      cancellationTerms:
        "Orders can be cancelled with 100% refund up to 24 hours prior to scheduled dispatch.",
      returnTerms:
        "Rentals are eligible for return after the minimum duration with a 15-day notice period.",
      termsConsentRequired: true,
    };
  }

  createOrder(input: CreateFurnitureOrderInput, userId: string): FurnitureOrder {
    const summary = this.calculateCheckoutSummary(input.items);
    const orderId = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
    const orderNumber = `ZB-FURN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const orderItems: FurnitureOrderLineItem[] = summary.items.map((item) => ({
      assetId: item.assetId,
      assetName: item.assetName,
      coverImageUrl: item.coverImageUrl,
      variantName: item.variantName,
      mode: item.mode,
      quantity: item.quantity,
      unitPriceOrRent: item.unitPriceOrRent,
      subtotal: item.subtotal,
      depositSubtotal: item.depositSubtotal,
    }));

    const hasRental = orderItems.some((i) => i.mode === "RENTAL");
    const hasSale = orderItems.some((i) => i.mode === "SALE");
    const mode = hasRental && hasSale ? "MIXED" : hasRental ? "RENTAL" : "SALE";

    const newOrder: FurnitureOrder = {
      id: orderId,
      orderNumber,
      userId,
      items: orderItems,
      mode,
      status: "CONFIRMED",
      paymentStatus: "COMPLETED",
      deliveryStatus: "PENDING",
      totalDueNow: summary.totalDueNow,
      recurringRentPerPeriod: summary.recurringRentPerPeriod,
      securityDeposit: summary.securityDeposit,
      deliveryFee: summary.deliveryFee,
      taxes: summary.taxes,
      deliveryAddress: input.deliveryAddress,
      trackingNumber: `ZB-LOG-${Math.floor(100000 + Math.random() * 900000)}`,
      estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      activeRentalStartDate: hasRental ? now : undefined,
      nextRenewalDate: summary.nextBillingDate,
      rentalDurationMonths: input.rentalDurationMonths || (hasRental ? 12 : undefined),
      canCancel: true,
      canRequestReturn: false,
      claimStatus: "NONE",
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(orderId, newOrder);
    return newOrder;
  }

  getOrders(userId: string): FurnitureOrderListResponse {
    const userOrders = Array.from(this.orders.values())
      .filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      items: userOrders,
      total: userOrders.length,
    };
  }

  getOrderById(orderId: string, userId: string): FurnitureOrder | null {
    const order = this.orders.get(orderId);
    if (!order || order.userId !== userId) {
      return null;
    }
    return order;
  }

  cancelOrder(orderId: string, reason: string, userId: string): FurnitureOrder {
    const order = this.getOrderById(orderId, userId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    if (!order.canCancel) {
      throw new Error("This order is no longer eligible for cancellation.");
    }

    const updated: FurnitureOrder = {
      ...order,
      status: "CANCELLED",
      paymentStatus: "CANCELLED",
      canCancel: false,
      cancellationReason: reason,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, updated);
    return updated;
  }

  requestReturn(orderId: string, input: RequestFurnitureReturnInput, userId: string): FurnitureOrder {
    const order = this.getOrderById(orderId, userId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    if (!order.canRequestReturn) {
      throw new Error("This rental order is not eligible for return.");
    }

    const updated: FurnitureOrder = {
      ...order,
      status: "RETURN_REQUESTED",
      returnRequestedAt: new Date().toISOString(),
      returnScheduledDate: input.preferredPickupDate,
      returnStatus: "SCHEDULED",
      canRequestReturn: false,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, updated);
    return updated;
  }

  fileDamageClaim(orderId: string, description: string, userId: string): FurnitureOrder {
    const order = this.getOrderById(orderId, userId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const updated: FurnitureOrder = {
      ...order,
      claimStatus: "SUBMITTED",
      claimDescription: description,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, updated);
    return updated;
  }

  retryPayment(orderId: string, userId: string): FurnitureOrder {
    const order = this.getOrderById(orderId, userId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    if (order.status === "CANCELLED" || order.status === "EXPIRED") {
      throw new Error("Cannot retry payment for a cancelled or expired order.");
    }
    if (order.paymentStatus === "COMPLETED") {
      throw new Error("Payment is already completed for this order.");
    }

    const updated: FurnitureOrder = {
      ...order,
      status: "CONFIRMED",
      paymentStatus: "COMPLETED",
      deliveryStatus: order.deliveryStatus === "PENDING" || order.deliveryStatus === "FAILED" ? "SCHEDULED" : order.deliveryStatus,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, updated);
    return updated;
  }
}

export const fixtureFurnitureStore = new FixtureFurnitureStore();
