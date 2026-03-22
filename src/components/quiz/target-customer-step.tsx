"use client";

import type { UseFormReturn } from "react-hook-form";
import type { FullQuizResponse } from "@/lib/validations/quiz";
import type { Platform } from "@/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface TargetCustomerStepProps {
  form: UseFormReturn<FullQuizResponse>;
  industryNicheText: string;
  onIndustryNicheChange: (v: string) => void;
  customerPainPointsText: string;
  onCustomerPainPointsChange: (v: string) => void;
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

function parseTextToArray(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TargetCustomerStep({
  form,
  industryNicheText,
  onIndustryNicheChange,
  customerPainPointsText,
  onCustomerPainPointsChange,
}: TargetCustomerStepProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const preferredPlatforms = watch("preferredPlatforms") ?? [];

  const handlePlatformToggle = (platform: Platform, checked: boolean) => {
    const updated = checked
      ? [...preferredPlatforms, platform]
      : preferredPlatforms.filter((p) => p !== platform);
    setValue("preferredPlatforms", updated, { shouldValidate: true });
  };

  const handleNicheBlur = () => {
    setValue("industryNiche", parseTextToArray(industryNicheText), {
      shouldValidate: true,
    });
  };

  const handlePainPointsBlur = () => {
    setValue("customerPainPoints", parseTextToArray(customerPainPointsText), {
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Your Audience</h2>

      {/* Ideal Customer */}
      <div className="space-y-2">
        <Label htmlFor="idealCustomer">Who is your ideal customer?</Label>
        <Textarea
          id="idealCustomer"
          placeholder="e.g. Early-stage founders building B2B SaaS tools who need help with pre-launch marketing"
          rows={3}
          {...register("idealCustomer")}
        />
        {errors.idealCustomer && (
          <p className="text-destructive text-sm">
            {errors.idealCustomer.message}
          </p>
        )}
      </div>

      {/* Industry / Niche */}
      <div className="space-y-2">
        <Label htmlFor="industryNiche">
          What industry or niche are you in?
        </Label>
        <Textarea
          id="industryNiche"
          placeholder="e.g. indie developers, B2B SaaS, fitness, e-commerce — separate with commas"
          rows={2}
          value={industryNicheText}
          onChange={(e) => onIndustryNicheChange(e.target.value)}
          onBlur={handleNicheBlur}
        />
        {errors.industryNiche && (
          <p className="text-destructive text-sm">
            {errors.industryNiche.message}
          </p>
        )}
      </div>

      {/* Pain Points */}
      <div className="space-y-2">
        <Label htmlFor="customerPainPoints">
          What are their biggest pain points?
        </Label>
        <Textarea
          id="customerPainPoints"
          placeholder="e.g. too expensive, too complex, no good alternatives — separate with commas"
          rows={2}
          value={customerPainPointsText}
          onChange={(e) => onCustomerPainPointsChange(e.target.value)}
          onBlur={handlePainPointsBlur}
        />
        {errors.customerPainPoints && (
          <p className="text-destructive text-sm">
            {errors.customerPainPoints.message}
          </p>
        )}
      </div>

      {/* Preferred Platforms */}
      <div className="space-y-3">
        <Label>Where does your audience hang out?</Label>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORM_OPTIONS.map((platform) => {
            const isChecked = preferredPlatforms.includes(platform.value);
            return (
              <div key={platform.value} className="flex items-center space-x-2">
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
          <p className="text-destructive text-sm">
            {errors.preferredPlatforms.message}
          </p>
        )}
      </div>
    </div>
  );
}
