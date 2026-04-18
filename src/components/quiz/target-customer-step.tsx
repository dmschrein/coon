"use client";

import type { UseFormReturn } from "react-hook-form";
import type { FullQuizResponse } from "@/lib/validations/quiz";
import type { Platform } from "@/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TargetCustomerStepProps {
  form: UseFormReturn<FullQuizResponse>;
  industryNicheText: string;
  onIndustryNicheChange: (v: string) => void;
}

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "reddit", label: "Reddit" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "threads", label: "Threads" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter / X" },
  { value: "discord", label: "Discord" },
  { value: "linkedin", label: "LinkedIn" },
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
}: TargetCustomerStepProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const preferredPlatforms = watch("preferredPlatforms") ?? [];
  const businessModel = watch("businessModel");
  const budgetRange = watch("budgetRange");

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

      {/* Preferred Platforms */}
      <div className="space-y-3">
        <Label>Where does your audience hang out online?</Label>
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

      {/* Business Model */}
      <div className="space-y-3">
        <Label>Business model</Label>
        <RadioGroup
          value={businessModel}
          onValueChange={(value) =>
            setValue(
              "businessModel",
              value as FullQuizResponse["businessModel"],
              { shouldValidate: true }
            )
          }
        >
          {[
            { value: "b2b", label: "B2B" },
            { value: "b2c", label: "B2C" },
            { value: "both", label: "Both" },
          ].map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`biz-${option.value}`} />
              <Label htmlFor={`biz-${option.value}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {errors.businessModel && (
          <p className="text-destructive text-sm">
            {errors.businessModel.message}
          </p>
        )}
      </div>

      {/* Budget Range */}
      <div className="space-y-2">
        <Label>Monthly marketing budget</Label>
        <Select
          value={budgetRange}
          onValueChange={(value) =>
            setValue("budgetRange", value as FullQuizResponse["budgetRange"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select budget range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free / No budget</SelectItem>
            <SelectItem value="low">Low ($1-100/mo)</SelectItem>
            <SelectItem value="medium">Medium ($100-500/mo)</SelectItem>
            <SelectItem value="high">High ($500-2000/mo)</SelectItem>
            <SelectItem value="enterprise">Enterprise ($2000+/mo)</SelectItem>
          </SelectContent>
        </Select>
        {errors.budgetRange && (
          <p className="text-destructive text-sm">
            {errors.budgetRange.message}
          </p>
        )}
      </div>
    </div>
  );
}
