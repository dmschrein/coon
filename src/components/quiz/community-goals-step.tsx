"use client";

import type { UseFormReturn } from "react-hook-form";
import type { FullQuizResponse } from "@/lib/validations/quiz";
import type { Platform } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CommunityGoalsStepProps {
  form: UseFormReturn<FullQuizResponse>;
}

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "reddit", label: "Reddit" },
  { value: "discord", label: "Discord" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "threads", label: "Threads" },
  { value: "hackernews", label: "Hacker News" },
  { value: "producthunt", label: "Product Hunt" },
  { value: "indiehackers", label: "Indie Hackers" },
];

const TIME_COMMITMENT_OPTIONS = [
  { value: "2", label: "1-2 hours" },
  { value: "4", label: "3-5 hours" },
  { value: "7", label: "5-10 hours" },
  { value: "12", label: "10+ hours" },
];

export function CommunityGoalsStep({ form }: CommunityGoalsStepProps) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;

  const launchTimeline = watch("launchTimeline");
  const targetAudienceSize = watch("targetAudienceSize");
  const weeklyTimeCommitment = watch("weeklyTimeCommitment");
  const preferredPlatforms = watch("preferredPlatforms") ?? [];
  const contentComfortLevel = watch("contentComfortLevel");

  // Convert ISO string to date input value (YYYY-MM-DD)
  const dateInputValue = launchTimeline
    ? launchTimeline.split("T")[0]
    : "";

  const handlePlatformToggle = (platform: Platform, checked: boolean) => {
    const updated = checked
      ? [...preferredPlatforms, platform]
      : preferredPlatforms.filter((p) => p !== platform);
    setValue("preferredPlatforms", updated, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Community Goals</h2>

      {/* Launch Timeline */}
      <div className="space-y-2">
        <Label htmlFor="launchTimeline">Launch Timeline</Label>
        <Input
          id="launchTimeline"
          type="date"
          value={dateInputValue}
          onChange={(e) => {
            const dateValue = e.target.value;
            if (dateValue) {
              setValue("launchTimeline", new Date(dateValue).toISOString(), {
                shouldValidate: true,
              });
            }
          }}
        />
        {errors.launchTimeline && (
          <p className="text-sm text-destructive">
            {errors.launchTimeline.message}
          </p>
        )}
      </div>

      {/* Target Audience Size */}
      <div className="space-y-2">
        <Label htmlFor="targetAudienceSize">Target Audience Size</Label>
        <Input
          id="targetAudienceSize"
          type="number"
          min={0}
          value={targetAudienceSize ?? ""}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10);
            setValue("targetAudienceSize", isNaN(num) ? 0 : num, {
              shouldValidate: true,
            });
          }}
        />
        {errors.targetAudienceSize && (
          <p className="text-sm text-destructive">
            {errors.targetAudienceSize.message}
          </p>
        )}
      </div>

      {/* Weekly Time Commitment */}
      <div className="space-y-2">
        <Label htmlFor="weeklyTimeCommitment">
          Weekly Time Commitment
        </Label>
        <Select
          value={String(weeklyTimeCommitment)}
          onValueChange={(value) =>
            setValue("weeklyTimeCommitment", parseInt(value, 10), {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="w-full" id="weeklyTimeCommitment">
            <SelectValue placeholder="Select time commitment" />
          </SelectTrigger>
          <SelectContent>
            {TIME_COMMITMENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.weeklyTimeCommitment && (
          <p className="text-sm text-destructive">
            {errors.weeklyTimeCommitment.message}
          </p>
        )}
      </div>

      {/* Preferred Platforms */}
      <div className="space-y-3">
        <Label>Preferred Platforms</Label>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORM_OPTIONS.map((platform) => {
            const isChecked = preferredPlatforms.includes(platform.value);
            return (
              <div
                key={platform.value}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`platform-${platform.value}`}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handlePlatformToggle(platform.value, checked === true)
                  }
                />
                <Label
                  htmlFor={`platform-${platform.value}`}
                  className="font-normal"
                >
                  {platform.label}
                </Label>
              </div>
            );
          })}
        </div>
        {errors.preferredPlatforms && (
          <p className="text-sm text-destructive">
            {errors.preferredPlatforms.message}
          </p>
        )}
      </div>

      {/* Content Comfort Level */}
      <div className="space-y-3">
        <Label>Content Comfort Level</Label>
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
          {[
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced", label: "Advanced" },
          ].map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`comfort-${option.value}`}
              />
              <Label
                htmlFor={`comfort-${option.value}`}
                className="font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {errors.contentComfortLevel && (
          <p className="text-sm text-destructive">
            {errors.contentComfortLevel.message}
          </p>
        )}
      </div>
    </div>
  );
}
