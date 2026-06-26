"use client";

import { toast } from "sonner";
import { Check, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SetupGuideStep } from "@/types";

interface SetupGuideStepListProps {
  steps: SetupGuideStep[];
  /** Stable key for a step's checkbox state, by step index within the section. */
  stepKey: (index: number) => string;
  checked: Set<string>;
  onToggle: (key: string) => void;
}

export function SetupGuideStepList({
  steps,
  stepKey,
  checked,
  onToggle,
}: SetupGuideStepListProps) {
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <ul className="space-y-3">
      {steps.map((step, index) => {
        const key = stepKey(index);
        const isChecked = checked.has(key);
        return (
          <li
            key={key}
            className="flex items-start gap-3 rounded-md border p-3"
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onToggle(key)}
              className="mt-0.5"
              aria-label="Mark step complete"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p
                className={cn(
                  "text-sm",
                  isChecked && "text-muted-foreground line-through"
                )}
              >
                {step.text}
              </p>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {step.estimatedMinutes} min
              </div>
              {step.copyReady ? (
                <div className="bg-muted/50 flex items-start justify-between gap-2 rounded-md border p-2">
                  <pre className="text-foreground min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-pre-wrap">
                    {step.copyReady}
                  </pre>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(step.copyReady as string)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              ) : null}
            </div>
            {isChecked ? (
              <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
