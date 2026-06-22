"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MONETIZATION_MODEL_CARDS } from "@/lib/constants/monetization-models";
import { useSaveMonetizationConfig } from "@/hooks/use-monetization-config";
import type { MonetizationModel } from "@/types";

type WizardStep = 1 | 2 | 3;

interface ModelWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSelected?: MonetizationModel[];
}

export function ModelWizard({
  open,
  onOpenChange,
  defaultSelected,
}: ModelWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selected, setSelected] = useState<Set<MonetizationModel>>(
    () => new Set(defaultSelected ?? [])
  );
  const [prevOpen, setPrevOpen] = useState(open);
  const save = useSaveMonetizationConfig();

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setStep(1);
      setSelected(new Set(defaultSelected ?? []));
    }
  }

  const toggle = (id: MonetizationModel) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleActivate = async () => {
    try {
      await save.mutateAsync({
        selectedModels: Array.from(selected),
        completedAt: new Date().toISOString(),
      });
      toast.success("Monetization model saved");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save model"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Pick how you&apos;ll monetize</DialogTitle>
              <DialogDescription>
                Choose one or more revenue models that fit your community. You
                can always change this later.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setStep(2)}>Next</Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Choose your models</DialogTitle>
              <DialogDescription>
                Pick every model you want to enable. Each one unlocks tooling
                tailored to that revenue source.
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
              {MONETIZATION_MODEL_CARDS.map((card) => {
                const Icon = card.icon;
                const isSelected = selected.has(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => toggle(card.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/40"
                    )}
                  >
                    {isSelected && (
                      <Check className="text-primary absolute top-3 right-3 h-4 w-4" />
                    )}
                    <div className="flex items-center gap-2">
                      <Icon className="text-primary h-5 w-5" />
                      <span className="font-semibold">{card.name}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {card.description}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      <span className="font-medium">Best when</span>{" "}
                      {card.bestWhen}
                    </p>
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={selected.size === 0}>
                Next
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm your selection</DialogTitle>
              <DialogDescription>
                You can revisit and edit these any time from the Monetization
                page.
              </DialogDescription>
            </DialogHeader>
            <ul
              aria-label="Selected models"
              className="divide-border divide-y rounded-md border"
            >
              {MONETIZATION_MODEL_CARDS.filter((c) => selected.has(c.id)).map(
                (card) => {
                  const Icon = card.icon;
                  return (
                    <li
                      key={card.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Icon className="text-primary h-5 w-5" />
                      <span className="font-medium">{card.name}</span>
                    </li>
                  );
                }
              )}
            </ul>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleActivate}
                disabled={save.isPending || selected.size === 0}
              >
                {save.isPending ? "Saving..." : "Activate"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
