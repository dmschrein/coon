"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelWizard } from "./model-wizard";
import { ReadinessScorecard } from "./readiness-scorecard";
import { useMonetizationConfig } from "@/hooks/use-monetization-config";
import { MONETIZATION_MODEL_CARDS } from "@/lib/constants/monetization-models";

export function MonetizationSetup() {
  const [open, setOpen] = useState(false);
  const { data: config, isLoading } = useMonetizationConfig();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full max-w-xl" />
      </div>
    );
  }

  if (config) {
    const selectedCards = MONETIZATION_MODEL_CARDS.filter((c) =>
      config.selectedModels.includes(c.id)
    );

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Your monetization model</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            These are the revenue models you&apos;ve activated for your
            community.
          </p>
        </div>
        <ul className="divide-border max-w-xl divide-y rounded-md border">
          {selectedCards.map((card) => {
            const Icon = card.icon;
            return (
              <li key={card.id} className="flex items-center gap-3 px-4 py-3">
                <Icon className="text-primary h-5 w-5" />
                <span className="font-medium">{card.name}</span>
              </li>
            );
          })}
          {selectedCards.length === 0 && (
            <li className="text-muted-foreground px-4 py-3 text-sm">
              No models selected yet.
            </li>
          )}
        </ul>
        <Button onClick={() => setOpen(true)}>Edit your model</Button>
        <ModelWizard
          open={open}
          onOpenChange={setOpen}
          defaultSelected={config.selectedModels}
        />
        <ReadinessScorecard enabled={config.selectedModels.length > 0} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Set up monetization</h2>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm">
          Choose how you&apos;ll earn from your community. You can mix and match
          models — paid memberships, sponsorships, courses, and more.
        </p>
      </div>
      <Button onClick={() => setOpen(true)}>
        Pick your monetization model
      </Button>
      <ModelWizard open={open} onOpenChange={setOpen} />
    </div>
  );
}
