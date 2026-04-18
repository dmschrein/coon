"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { label: "Mapping your audience...", duration: 3000 },
  { label: "Discovering communities...", duration: 4000 },
  { label: "Building your strategy...", duration: 3000 },
];

const TOTAL_DURATION = STEPS.reduce((sum, s) => sum + s.duration, 0);

export function CompletionScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(pct);

      let accumulated = 0;
      for (let i = 0; i < STEPS.length; i++) {
        accumulated += STEPS[i].duration;
        if (elapsed < accumulated) {
          setCurrentStep(i);
          break;
        }
        if (i === STEPS.length - 1) {
          setCurrentStep(i);
        }
      }

      if (elapsed >= TOTAL_DURATION) {
        clearInterval(interval);
        router.push("/dashboard/audience?autoGenerate=true");
      }
    }, 50);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Analyzing your market...</h2>
        <p className="text-zinc-500">
          We&apos;re building your personalized audience profile
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <Progress value={progress} className="h-2" />

        <div className="space-y-3">
          {STEPS.map((step, index) => (
            <div
              key={step.label}
              className={`flex items-center space-x-3 transition-opacity duration-300 ${
                index <= currentStep ? "opacity-100" : "opacity-30"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  index < currentStep
                    ? "bg-green-500"
                    : index === currentStep
                      ? "animate-pulse bg-blue-500"
                      : "bg-zinc-300"
                }`}
              />
              <span className="text-sm">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
