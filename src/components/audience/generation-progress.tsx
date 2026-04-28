"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

const AUDIENCE_GENERATION_STEPS = [
  "Analyzing your product...",
  "Researching your market...",
  "Building audience personas...",
  "Crafting messaging insights...",
  "Almost done...",
];

export function GenerationProgress({
  isGenerating,
}: {
  isGenerating: boolean;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isGenerating) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    stepIntervalRef.current = setInterval(() => {
      setStepIndex((i) =>
        i < AUDIENCE_GENERATION_STEPS.length - 1 ? i + 1 : i
      );
    }, 12000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, [isGenerating]);

  if (!isGenerating) return null;

  const progressPct = Math.min(
    (stepIndex / (AUDIENCE_GENERATION_STEPS.length - 1)) * 90,
    90
  );

  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="w-full max-w-md space-y-6 text-center">
        <Sparkles className="text-primary mx-auto h-12 w-12 animate-pulse" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            Building Your Audience Profile
          </h2>
          <p className="text-muted-foreground text-sm">
            {AUDIENCE_GENERATION_STEPS[stepIndex]}
          </p>
        </div>
        <div className="space-y-2">
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-3000 ease-in-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">{elapsed}s elapsed</p>
        </div>
      </div>
    </div>
  );
}
