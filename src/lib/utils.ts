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

// Format a tier price with its billing cycle suffix.
// e.g. (2900, "monthly") -> "$29/month"; (1000, "one_time") -> "$10 one-time"
export function formatTierPrice(
  cents: number,
  billingCycle: "monthly" | "yearly" | "one_time"
): string {
  const amount = formatCurrency(cents);
  if (billingCycle === "monthly") return `${amount}/month`;
  if (billingCycle === "yearly") return `${amount}/year`;
  return `${amount} one-time`;
}
