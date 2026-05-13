import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format an integer amount of cents as a human-readable currency string.
// Display rounds to whole dollars (no fractional cents) since deal_values
// are typically stored in whole-dollar cent multiples (e.g. $1,500.00 = 150000).
export function formatCurrency(
  cents: number,
  currency: string = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
