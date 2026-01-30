"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { FullQuizResponse } from "@/lib/validations/quiz";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface TargetCustomerStepProps {
  form: UseFormReturn<FullQuizResponse>;
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim())) {
        onChange([...value, input.trim()]);
      }
      setInput("");
    }
  };

  return (
    <div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      <div className="flex flex-wrap gap-1 mt-2">
        {value.map((tag, i) => (
          <Badge
            key={i}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            {tag} &times;
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function TargetCustomerStep({ form }: TargetCustomerStepProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const industryNiche = watch("industryNiche") ?? [];
  const customerPainPoints = watch("customerPainPoints") ?? [];
  const currentSolutions = watch("currentSolutions") ?? [];
  const budgetRange = watch("budgetRange");
  const businessModel = watch("businessModel");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Target Customer</h2>

      {/* Ideal Customer */}
      <div className="space-y-2">
        <Label htmlFor="idealCustomer">Who is your ideal customer?</Label>
        <Textarea
          id="idealCustomer"
          placeholder="Describe your ideal customer in detail..."
          {...register("idealCustomer")}
        />
        {errors.idealCustomer && (
          <p className="text-sm text-destructive">
            {errors.idealCustomer.message}
          </p>
        )}
      </div>

      {/* Industry Niche */}
      <div className="space-y-2">
        <Label>Industry / Niche</Label>
        <TagInput
          value={industryNiche}
          onChange={(v) =>
            setValue("industryNiche", v, { shouldValidate: true })
          }
          placeholder="Type a niche and press Enter..."
        />
        {errors.industryNiche && (
          <p className="text-sm text-destructive">
            {errors.industryNiche.message}
          </p>
        )}
      </div>

      {/* Customer Pain Points */}
      <div className="space-y-2">
        <Label>What are their biggest pain points?</Label>
        <TagInput
          value={customerPainPoints}
          onChange={(v) =>
            setValue("customerPainPoints", v, { shouldValidate: true })
          }
          placeholder="Type a pain point and press Enter..."
        />
        {errors.customerPainPoints && (
          <p className="text-sm text-destructive">
            {errors.customerPainPoints.message}
          </p>
        )}
      </div>

      {/* Current Solutions */}
      <div className="space-y-2">
        <Label>Where do they currently go for solutions?</Label>
        <TagInput
          value={currentSolutions}
          onChange={(v) =>
            setValue("currentSolutions", v, { shouldValidate: true })
          }
          placeholder="Type a solution and press Enter..."
        />
        {errors.currentSolutions && (
          <p className="text-sm text-destructive">
            {errors.currentSolutions.message}
          </p>
        )}
      </div>

      {/* Budget Range */}
      <div className="space-y-2">
        <Label htmlFor="budgetRange">Budget Range</Label>
        <Select
          value={budgetRange}
          onValueChange={(value) =>
            setValue(
              "budgetRange",
              value as FullQuizResponse["budgetRange"],
              { shouldValidate: true }
            )
          }
        >
          <SelectTrigger className="w-full" id="budgetRange">
            <SelectValue placeholder="Select budget range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        {errors.budgetRange && (
          <p className="text-sm text-destructive">
            {errors.budgetRange.message}
          </p>
        )}
      </div>

      {/* Business Model */}
      <div className="space-y-3">
        <Label>Business Model</Label>
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
              <RadioGroupItem
                value={option.value}
                id={`model-${option.value}`}
              />
              <Label
                htmlFor={`model-${option.value}`}
                className="font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {errors.businessModel && (
          <p className="text-sm text-destructive">
            {errors.businessModel.message}
          </p>
        )}
      </div>
    </div>
  );
}
