"use client";

import { cn } from "@/lib/utils";

const DURATIONS = [
  { value: "1-week", label: "1 Week" },
  { value: "2-weeks", label: "2 Weeks" },
  { value: "1-month", label: "1 Month" },
  { value: "ongoing", label: "Ongoing" },
] as const;

interface DurationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {DURATIONS.map((duration) => (
        <button
          key={duration.value}
          type="button"
          onClick={() => onChange(duration.value)}
          className={cn(
            "rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
            value === duration.value
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          {duration.label}
        </button>
      ))}
    </div>
  );
}
