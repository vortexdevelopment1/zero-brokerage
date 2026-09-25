import { AdCampaign, AdRevenueOverview, AdType, AdStatus } from "@/types/adRevenue";
import { mulberry32, pick, randInt, daysAgoISO, daysFromNowISO } from "./seed";

const rng = mulberry32(6641);

const ADVERTISERS = [
  "Prestige Estates Projects Ltd",
  "Sobha Developers Ltd",
  "Godrej Properties Ltd",
  "Brigade Enterprises",
  "HDFC Home Loans Corporate",
  "ICICI Bank Mortgage Solutions",
  "Livspace Interior Solutions",
  "Asian Paints Home Decor",
  "Total Environment Homes",
  "Puravankara Limited",
];

const CAMPAIGN_TITLES: Record<AdType, string[]> = {
  sponsored_listing: [
    "Featured Launch: Prestige City Tower D",
    "Prime Commercial Floors at BKC Mumbai",
    "Sobha Palm Court Luxury Penthouse Spotlight",
    "Greenwood Villas Phase 2 Priority Search",
  ],
  homepage_banner: [
    "Zero Interest Festival Home Loan Promotion",
    "Hero Banner: Turnkey Modular Interiors by Livspace",
    "ZeroBroker Annual Monsoon Property Conclave Banner",
    "Asian Paints Color of the Year Splash Promotion",
  ],
  geo_targeted: [
    "Targeted Whitefield Tech-Corridor IT Professionals",
    "High-Net-Worth Bandra Kurla Resident Radius",
    "Hitech City & Gachibowli Cyber Towers Showcase",
    "Noida Expressway Luxury Condos Local Push",
  ],
};

const TARGET_GEOS = [
  "Bengaluru - Whitefield & Outer Ring Road",
  "Mumbai - Bandra Kurla Complex (BKC) & Worli",
  "Delhi NCR - Gurugram Golf Course Ext & Cyber City",
  "Hyderabad - Hitech City & Financial District",
  "Pune - Hinjewadi IT Park & Koregaon Park",
  "Pan-India Top 7 Metros",
];

export function generateMockAdCampaigns(count = 20): AdCampaign[] {
  const campaigns: AdCampaign[] = [];
  const types: AdType[] = ["sponsored_listing", "homepage_banner", "geo_targeted"];
  const statuses: AdStatus[] = ["active", "active", "completed", "scheduled", "paused"];

  for (let i = 0; i < count; i++) {
    const id = `AD-${(9040 + i).toString()}`;
    const type = pick(rng, types);
    const advertiser = pick(rng, ADVERTISERS);
    const title = pick(rng, CAMPAIGN_TITLES[type]);
    const targetLocation = pick(rng, TARGET_GEOS);
    const impressions = randInt(rng, 45000, 380000);
    const ctr = Math.round(randInt(rng, 18, 48) * 10) / 100; // 1.8% to 4.8%
    const clicks = Math.round((impressions * ctr) / 100);
    const amount = randInt(rng, 65, 450) * 1000; // ₹65,000 to ₹4,50,000
    const status = pick(rng, statuses);
    const startDaysAgo = randInt(rng, 5, 60);

    campaigns.push({
      id,
      advertiser,
      advertiserContact: `ads@${advertiser.toLowerCase().split(" ")[0]}.com`,
      type,
      title,
      targetLocation,
      impressions,
      clicks,
      ctr,
      startDate: daysAgoISO(rng, startDaysAgo),
      endDate: status === "completed" ? daysAgoISO(rng, 2) : daysFromNowISO(randInt(rng, 10, 45)),
      amount,
      paymentStatus: status === "scheduled" ? "pending" : "paid",
      status,
      createdAt: daysAgoISO(rng, startDaysAgo + 3),
    });
  }

  return campaigns;
}

export const MOCK_AD_CAMPAIGNS: AdCampaign[] = generateMockAdCampaigns(22);

export const MOCK_AD_REVENUE_OVERVIEW: AdRevenueOverview = {
  totalRevenue: 4890000,
  activeCampaignsCount: 9,
  completedCampaignsCount: 10,
  averageCtr: 3.42,
  monthlyGrowthRate: 18.5,
  revenueTrend: [
    { month: "Jan", sponsoredListings: 180000, homepageBanners: 120000, geoTargeted: 90000, total: 390000 },
    { month: "Feb", sponsoredListings: 220000, homepageBanners: 140000, geoTargeted: 110000, total: 470000 },
    { month: "Mar", sponsoredListings: 310000, homepageBanners: 190000, geoTargeted: 150000, total: 650000 },
    { month: "Apr", sponsoredListings: 360000, homepageBanners: 210000, geoTargeted: 180000, total: 750000 },
    { month: "May", sponsoredListings: 420000, homepageBanners: 260000, geoTargeted: 220000, total: 900000 },
    { month: "Jun", sponsoredListings: 490000, homepageBanners: 310000, geoTargeted: 280000, total: 1080000 },
    { month: "Jul", sponsoredListings: 540000, homepageBanners: 360000, geoTargeted: 320000, total: 1220000 },
  ],
  revenueByType: [
    { type: "Sponsored Listings", value: 2520000 },
    { type: "Homepage Banners", value: 1390000 },
    { type: "Geo-targeted Ads", value: 980000 },
  ],
};
