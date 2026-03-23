"use client";

import type { UseFormReturn } from "react-hook-form";
import type { FullQuizResponse } from "@/lib/validations/quiz";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoalsStepProps {
  form: UseFormReturn<FullQuizResponse>;
}

const GOAL_OPTIONS = [
  {
    value: "pre-launch" as const,
    label: "Build pre-launch audience",
    description: "Grow a community before you launch your product",
  },
  {
    value: "grow-existing" as const,
    label: "Grow existing audience",
    description: "Expand and deepen your current community",
  },
  {
    value: "promote-product" as const,
    label: "Promote a product/launch",
    description: "Drive awareness and signups for an upcoming launch",
  },
  {
    value: "thought-leadership" as const,
    label: "Build thought leadership",
    description: "Establish yourself as an authority in your space",
  },
];

const TIME_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 3, label: "3 hours" },
  { value: 5, label: "5 hours" },
  { value: 10, label: "10 hours" },
  { value: 15, label: "15 hours" },
  { value: 20, label: "20 hours" },
];

const COMFORT_OPTIONS = [
  {
    value: "beginner" as const,
    label: "Beginner",
    description: "New to content creation",
  },
  {
    value: "intermediate" as const,
    label: "Intermediate",
    description: "Some experience creating content",
  },
  {
    value: "advanced" as const,
    label: "Advanced",
    description: "Experienced content creator",
  },
];

export function GoalsStep({ form }: GoalsStepProps) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;

  const primaryGoal = watch("primaryGoal");
  const weeklyTimeCommitment = watch("weeklyTimeCommitment");
  const contentComfortLevel = watch("contentComfortLevel");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Your Goals</h2>

      {/* Primary Goal */}
      <div className="space-y-3">
        <Label>What are you trying to achieve?</Label>
        <RadioGroup
          value={primaryGoal}
          onValueChange={(value) =>
            setValue("primaryGoal", value as FullQuizResponse["primaryGoal"], {
              shouldValidate: true,
            })
          }
        >
          {GOAL_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-start space-x-3 rounded-lg border p-3"
            >
              <RadioGroupItem
                value={option.value}
                id={`goal-${option.value}`}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor={`goal-${option.value}`} className="font-medium">
                  {option.label}
                </Label>
                <p className="text-sm text-zinc-500">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
        {errors.primaryGoal && (
          <p className="text-destructive text-sm">
            {errors.primaryGoal.message}
          </p>
        )}
      </div>

      {/* Launch Timeline */}
      <div className="space-y-2">
        <Label htmlFor="launchTimeline">When do you plan to launch?</Label>
        <input
          type="date"
          id="launchTimeline"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          value={
            watch("launchTimeline")
              ? new Date(watch("launchTimeline")).toISOString().split("T")[0]
              : ""
          }
          onChange={(e) => {
            if (e.target.value) {
              setValue(
                "launchTimeline",
                new Date(e.target.value).toISOString(),
                { shouldValidate: true }
              );
            }
          }}
        />
        {errors.launchTimeline && (
          <p className="text-destructive text-sm">
            {errors.launchTimeline.message}
          </p>
        )}
      </div>

      {/* Weekly Time Commitment */}
      <div className="space-y-2">
        <Label>How much time per week can you dedicate?</Label>
        <Select
          value={String(weeklyTimeCommitment)}
          onValueChange={(value) =>
            setValue("weeklyTimeCommitment", Number(value), {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select hours per week" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label} / week
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.weeklyTimeCommitment && (
          <p className="text-destructive text-sm">
            {errors.weeklyTimeCommitment.message}
          </p>
        )}
      </div>

      {/* Content Comfort Level */}
      <div className="space-y-3">
        <Label>Content creation comfort level</Label>
        <RadioGroup
          value={contentComfortLevel}
          onValueChange={(value) =>
            setValue(
              "contentComfortLevel",
              value as FullQuizResponse["contentComfortLevel"],
              { shouldValidate: true }
            )
          }
        >
          {COMFORT_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem
                value={option.value}
                id={`comfort-${option.value}`}
              />
              <div>
                <Label
                  htmlFor={`comfort-${option.value}`}
                  className="font-normal"
                >
                  {option.label}
                </Label>
                <p className="text-xs text-zinc-500">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
        {errors.contentComfortLevel && (
          <p className="text-destructive text-sm">
            {errors.contentComfortLevel.message}
          </p>
        )}
      </div>
    </div>
  );
}
