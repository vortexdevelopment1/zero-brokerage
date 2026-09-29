/**
 * Shared Discovery Formatters
 *
 * Formats property prices (Indian currency formatting with Lakhs & Crores)
 * and spatial dimensions (sq.ft).
 */

export function formatPrice(price: number, currency: string = "INR"): string {
  if (isNaN(price)) return "Price on Request";

  // Indian number formatting (Lakhs / Crores)
  if (currency === "INR" || currency === "₹") {
    if (price >= 10000000) {
      const cr = Number((price / 10000000).toFixed(2));
      return `₹${cr} Cr`;
    }
    if (price >= 100000) {
      const lk = Number((price / 100000).toFixed(2));
      return `₹${lk} L`;
    }
    return `₹${price.toLocaleString("en-IN")}`;
  }

  return `${currency} ${price.toLocaleString()}`;
}

export function formatArea(sqFt?: number): string | null {
  if (!sqFt || isNaN(sqFt)) return null;
  return `${sqFt.toLocaleString()} sq.ft`;
}
