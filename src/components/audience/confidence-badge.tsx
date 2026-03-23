import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/types";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

const BADGE_CONFIG: Record<
  ConfidenceLevel,
  { label: string; className: string }
> = {
  quiz_based: {
    label: "Quiz-based",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  data_informed: {
    label: "Data-informed",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  data_validated: {
    label: "Data-validated",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
};

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const config = BADGE_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
