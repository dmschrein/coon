"use client";

import { cn } from "@/lib/utils";

const GOALS = [
  {
    value: "build-awareness",
    label: "Build Awareness",
    description: "Get your brand in front of new audiences",
  },
  {
    value: "drive-engagement",
    label: "Drive Engagement",
    description: "Spark conversations and build community",
  },
  {
    value: "generate-leads",
    label: "Generate Leads",
    description: "Capture interest and grow your pipeline",
  },
  {
    value: "promote-product",
    label: "Promote Product",
    description: "Drive signups, sales, or downloads",
  },
  {
    value: "educate",
    label: "Educate",
    description: "Establish thought leadership and trust",
  },
] as const;

interface GoalSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function GoalSelector({ value, onChange }: GoalSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {GOALS.map((goal) => (
        <button
          key={goal.value}
          type="button"
          onClick={() => onChange(goal.value)}
          className={cn(
            "rounded-lg border-2 p-4 text-left transition-colors",
            value === goal.value
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="font-medium">{goal.label}</div>
          <div className="text-muted-foreground mt-1 text-sm">
            {goal.description}
          </div>
        </button>
      ))}
    </div>
  );
}
