// Deterministic pseudo-random generator so mock data is stable across
// server/client renders (avoids hydration mismatches) yet still looks varied.

export function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickMany<T>(rng: () => number, arr: readonly T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randFloat(rng: () => number, min: number, max: number, decimals = 1): number {
  const v = rng() * (max - min) + min;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

export function daysAgoISO(rng: () => number, maxDays: number): string {
  const days = randInt(rng, 0, maxDays);
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Krishna", "Ishaan",
  "Ananya", "Diya", "Saanvi", "Myra", "Aadhya", "Kavya", "Riya", "Isha",
  "Rohan", "Kabir", "Aryan", "Dhruv", "Neha", "Priya", "Sneha", "Pooja",
  "Karthik", "Sanjay", "Rahul", "Vikram", "Meera", "Nisha", "Tanvi", "Ritika",
] as const;

export const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Mehta", "Iyer", "Nair", "Reddy", "Rao",
  "Kapoor", "Malhotra", "Chatterjee", "Bose", "Pillai", "Menon", "Joshi", "Desai",
  "Agarwal", "Bhatt", "Chauhan", "Kulkarni", "Patil", "Shah", "Singh", "Trivedi",
] as const;

export const CITIES = [
  "Mumbai", "Delhi NCR", "Bengaluru", "Pune", "Hyderabad", "Chennai",
  "Kolkata", "Ahmedabad", "Indore", "Jaipur", "Chandigarh", "Kochi",
] as const;

export const LOCALITIES: Record<string, string[]> = {
  Mumbai: ["Andheri West", "Powai", "Bandra Kurla Complex", "Thane West", "Worli"],
  "Delhi NCR": ["Gurugram Sector 54", "Noida Sector 62", "Dwarka", "Saket", "Cyber City"],
  Bengaluru: ["Whitefield", "Indiranagar", "HSR Layout", "Electronic City", "Hebbal"],
  Pune: ["Hinjewadi", "Baner", "Koregaon Park", "Viman Nagar", "Kharadi"],
  Hyderabad: ["Gachibowli", "Hitech City", "Banjara Hills", "Kondapur", "Madhapur"],
  Chennai: ["OMR", "Velachery", "Anna Nagar", "T Nagar", "Porur"],
  Kolkata: ["Salt Lake", "New Town", "Park Street", "Ballygunge", "Rajarhat"],
  Ahmedabad: ["SG Highway", "Bopal", "Satellite", "Prahlad Nagar", "Vastrapur"],
  Indore: ["Vijay Nagar", "Palasia", "AB Road", "Rau", "Bicholi Mardana"],
  Jaipur: ["Vaishali Nagar", "Malviya Nagar", "C-Scheme", "Mansarovar", "Jagatpura"],
  Chandigarh: ["Sector 17", "Sector 22", "Industrial Area", "Sector 35", "Mohali"],
  Kochi: ["Kakkanad", "Edappally", "Marine Drive", "Panampilly Nagar", "Vyttila"],
};

export function fullName(rng: () => number): string {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
}
