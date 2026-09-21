import { Property, PropertyDetail, PropertyMainCategory, PropertyStatus } from "@/types/property";
import { mulberry32, pick, randInt, daysAgoISO, fullName, CITIES, LOCALITIES } from "./seed";

const STATUSES: PropertyStatus[] = ["approved", "approved", "pending", "rejected", "unavailable", "hidden"];

const SUBTYPES: Record<PropertyMainCategory, string[]> = {
  residential: ["Flat", "Apartment", "Penthouse", "Villa", "Builder Floor"],
  commercial: ["Bare-shell Office", "Co-working Space", "Retail Showroom", "Cafeteria"],
  land: ["Agricultural Farmland", "Industrial Plot", "Commercial Parcel"],
  furniture: [
    "Workstation Bundle (Packaged)", "Desk & Chair Setup (Packaged)", "Cafeteria Setup (Packaged)",
    "Conference Table (Individual)", "Executive Chair (Individual)", "Server Room Rack (Individual)",
    "Reception Couch (Individual)",
  ],
};

const TITLE_PREFIX: Record<PropertyMainCategory, string[]> = {
  residential: ["Skyline Residency", "Palm Grove", "Cedar Heights", "Maple Enclave", "Orchid Towers", "Lakeview"],
  commercial: ["Cedar Business Park", "Vantage Corporate Hub", "Meridian Trade Centre", "Northgate Plaza"],
  land: ["Green Acres", "Silverline Farmland", "Horizon Industrial Belt", "Sunrise Plots"],
  furniture: ["Vortex Office Collection", "Elevate Workspace Kit", "Regency Boardroom Set", "Summit Cafeteria Pack"],
};

function priceFor(category: PropertyMainCategory, rng: () => number): { price: number; unit: "sale" | "rent-month" } {
  if (category === "residential") {
    return rng() > 0.45
      ? { price: randInt(rng, 4500000, 42000000), unit: "sale" }
      : { price: randInt(rng, 15000, 180000), unit: "rent-month" };
  }
  if (category === "commercial") {
    return rng() > 0.5
      ? { price: randInt(rng, 8000000, 90000000), unit: "sale" }
      : { price: randInt(rng, 60000, 950000), unit: "rent-month" };
  }
  if (category === "land") {
    return { price: randInt(rng, 2500000, 180000000), unit: "sale" };
  }
  return rng() > 0.5
    ? { price: randInt(rng, 8000, 240000), unit: "sale" }
    : { price: randInt(rng, 1500, 45000), unit: "rent-month" };
}

function generateProperties(count: number): Property[] {
  const rng = mulberry32(4004);
  const categories: PropertyMainCategory[] = ["residential", "commercial", "land", "furniture"];
  const props: Property[] = [];
  for (let i = 0; i < count; i++) {
    const category = pick(rng, categories);
    const city = pick(rng, CITIES);
    const locality = pick(rng, LOCALITIES[city] ?? ["Central"]);
    const { price, unit } = priceFor(category, rng);
    const isLuxury = category !== "furniture" && rng() > 0.88;
    props.push({
      id: `PRP-${(70000 + i).toString()}`,
      title: `${pick(rng, TITLE_PREFIX[category])} ${pick(rng, SUBTYPES[category])}`,
      category,
      subtype: pick(rng, SUBTYPES[category]),
      price,
      priceUnit: unit,
      city,
      locality,
      status: pick(rng, STATUSES),
      isLuxury,
      isPremium: rng() > 0.75,
      broker: rng() > 0.2 ? fullName(rng) : null,
      agency: rng() > 0.55 ? `${pick(rng, ["Skyline", "Horizon", "Evergreen", "Pinnacle"])} Estates` : null,
      createdAt: daysAgoISO(rng, 300),
      coordinates: { lat: 12 + rng() * 16, lng: 72 + rng() * 16 },
    });
  }
  return props;
}

export const MOCK_PROPERTIES: Property[] = generateProperties(340);

export function getMockPropertyDetail(id: string): PropertyDetail | null {
  const property = MOCK_PROPERTIES.find((p) => p.id === id);
  if (!property) return null;
  const rng = mulberry32(id.length * 6067 + 13);
  const attributes: Record<string, string | number> =
    property.category === "residential"
      ? { "Furnishing": pick(rng, ["Unfurnished", "Semi-Furnished", "Fully Furnished"]), "Maintenance / mo": randInt(rng, 1500, 12000), "Tenant Preference": pick(rng, ["Family", "Bachelors", "Any"]) }
      : property.category === "commercial"
      ? { "Workstation Capacity": randInt(rng, 20, 400), "Power Backup": pick(rng, ["Yes", "Partial", "No"]), "Cafeteria Integration": pick(rng, ["Yes", "No"]) }
      : property.category === "land"
      ? { "Zoning": pick(rng, ["Verified", "Pending Verification"]), "Road Width (ft)": randInt(rng, 20, 100), "Soil Classification": pick(rng, ["Loamy", "Clay", "Sandy", "Black Cotton"]) }
      : { "Type": property.subtype.includes("Packaged") ? "Packaged Setup" : "Individual Asset", "Rental Mode": pick(rng, ["Monthly", "Outright Sale"]), "Deposit Refundable": pick(rng, ["Yes", "No"]) };

  return {
    ...property,
    description: `A ${property.subtype.toLowerCase()} listed in ${property.locality}, ${property.city}. Verified through the VortexCubes moderation workflow; spatial coordinates indexed for PostGIS radius search.`,
    attributes,
    images: randInt(rng, 3, 18),
  };
}
