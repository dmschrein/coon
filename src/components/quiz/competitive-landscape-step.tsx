"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import type { FullQuizResponse } from "@/lib/validations/quiz";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CompetitiveLandscapeStepProps {
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

export function CompetitiveLandscapeStep({
  form,
}: CompetitiveLandscapeStepProps) {
  const {
    register,
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "competitors",
  });

  const competitorStrengths = watch("competitorStrengths") ?? [];
  const competitorWeaknesses = watch("competitorWeaknesses") ?? [];
  const differentiators = watch("differentiators") ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Competitive Landscape</h2>

      {/* Competitors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Competitors</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", url: "", notes: "" })}
          >
            Add Competitor
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-zinc-400">
            No competitors added yet. Click &quot;Add Competitor&quot; to get
            started.
          </p>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="space-y-2 rounded-md border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Competitor {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Competitor name"
                {...register(`competitors.${index}.name`)}
              />
              <Input
                placeholder="Website URL (optional)"
                {...register(`competitors.${index}.url`)}
              />
              <Input
                placeholder="Notes (optional)"
                {...register(`competitors.${index}.notes`)}
              />
            </div>
          </div>
        ))}

        {errors.competitors && (
          <p className="text-sm text-destructive">
            {errors.competitors.message}
          </p>
        )}
      </div>

      {/* Competitor Strengths */}
      <div className="space-y-2">
        <Label>What do customers love about competitors?</Label>
        <TagInput
          value={competitorStrengths}
          onChange={(v) =>
            setValue("competitorStrengths", v, { shouldValidate: true })
          }
          placeholder="Type a strength and press Enter..."
        />
        {errors.competitorStrengths && (
          <p className="text-sm text-destructive">
            {errors.competitorStrengths.message}
          </p>
        )}
      </div>

      {/* Competitor Weaknesses */}
      <div className="space-y-2">
        <Label>What do customers hate about competitors?</Label>
        <TagInput
          value={competitorWeaknesses}
          onChange={(v) =>
            setValue("competitorWeaknesses", v, { shouldValidate: true })
          }
          placeholder="Type a weakness and press Enter..."
        />
        {errors.competitorWeaknesses && (
          <p className="text-sm text-destructive">
            {errors.competitorWeaknesses.message}
          </p>
        )}
      </div>

      {/* Differentiators */}
      <div className="space-y-2">
        <Label>How will you be different?</Label>
        <TagInput
          value={differentiators}
          onChange={(v) =>
            setValue("differentiators", v, { shouldValidate: true })
          }
          placeholder="Type a differentiator and press Enter..."
        />
        {errors.differentiators && (
          <p className="text-sm text-destructive">
            {errors.differentiators.message}
          </p>
        )}
      </div>
    </div>
  );
}
