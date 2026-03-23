"use client";

import type { UseFormReturn } from "react-hook-form";
import type { FullQuizResponse } from "@/lib/validations/quiz";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ProductDefinitionStepProps {
  form: UseFormReturn<FullQuizResponse>;
}

export function ProductDefinitionStep({ form }: ProductDefinitionStepProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const elevatorPitch = watch("elevatorPitch");
  const productType = watch("productType");
  const currentStage = watch("currentStage");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Your Product</h2>

      {/* Product Type */}
      <div className="space-y-2">
        <Label htmlFor="productType">Product Type</Label>
        <Select
          value={productType}
          onValueChange={(value) =>
            setValue("productType", value as FullQuizResponse["productType"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="w-full" id="productType">
            <SelectValue placeholder="Select a product type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="saas">SaaS</SelectItem>
            <SelectItem value="physical">Physical Product</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="content">Content</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.productType && (
          <p className="text-destructive text-sm">
            {errors.productType.message}
          </p>
        )}
      </div>

      {/* Elevator Pitch */}
      <div className="space-y-2">
        <Label htmlFor="elevatorPitch">
          Describe your product in one sentence
        </Label>
        <Textarea
          id="elevatorPitch"
          maxLength={280}
          placeholder="A concise description of what you're building..."
          {...register("elevatorPitch")}
        />
        <div className="flex justify-between">
          {errors.elevatorPitch ? (
            <p className="text-destructive text-sm">
              {errors.elevatorPitch.message}
            </p>
          ) : (
            <span />
          )}
          <p className="text-xs text-zinc-400">
            {elevatorPitch?.length ?? 0}/280
          </p>
        </div>
      </div>

      {/* Problem Solved */}
      <div className="space-y-2">
        <Label htmlFor="problemSolved">What problem does it solve?</Label>
        <Textarea
          id="problemSolved"
          placeholder="Describe the core problem your product addresses..."
          {...register("problemSolved")}
        />
        {errors.problemSolved && (
          <p className="text-destructive text-sm">
            {errors.problemSolved.message}
          </p>
        )}
      </div>

      {/* Current Stage */}
      <div className="space-y-3">
        <Label>Current Stage</Label>
        <RadioGroup
          value={currentStage}
          onValueChange={(value) =>
            setValue(
              "currentStage",
              value as FullQuizResponse["currentStage"],
              { shouldValidate: true }
            )
          }
        >
          {[
            { value: "idea", label: "Idea" },
            { value: "mvp", label: "MVP" },
            { value: "beta", label: "Beta" },
            { value: "launched", label: "Launched" },
          ].map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`stage-${option.value}`}
              />
              <Label htmlFor={`stage-${option.value}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {errors.currentStage && (
          <p className="text-destructive text-sm">
            {errors.currentStage.message}
          </p>
        )}
      </div>
    </div>
  );
}
