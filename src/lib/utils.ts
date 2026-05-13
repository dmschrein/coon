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

// RFC 4180 CSV serializer. A cell is wrapped in double-quotes when it contains
// a comma, a double-quote, or a newline; embedded double-quotes are escaped
// by doubling them.
export function csvFromRows(headers: string[], rows: string[][]): string {
  const escape = (cell: string): string => {
    if (/[",\n\r]/.test(cell)) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}
