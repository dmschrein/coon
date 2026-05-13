"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonetizationReadiness } from "@/hooks/use-monetization-readiness";
import { MONETIZATION_MODEL_CARDS } from "@/lib/constants/monetization-models";
import type { ModelReadiness } from "@/types";

interface ReadinessScorecardProps {
  enabled?: boolean;
}

export function ReadinessScorecard({
  enabled = true,
}: ReadinessScorecardProps) {
  const { data, isLoading, error } = useMonetizationReadiness(enabled);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-muted-foreground text-sm">
        Couldn&apos;t load readiness scores. Try again in a moment.
      </p>
    );
  }

  if (!data || data.models.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Launch readiness</h3>
        <p className="text-muted-foreground text-sm">{data.summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.models.map((m) => (
          <ModelCard key={m.name} model={m} />
        ))}
      </div>
    </div>
  );
}

function ModelCard({ model }: { model: ModelReadiness }) {
  const card = MONETIZATION_MODEL_CARDS.find((c) => c.id === model.name);
  const displayName = card?.name ?? model.name;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{displayName}</CardTitle>
        {model.readyToLaunch && (
          <CheckCircle2
            className="h-5 w-5 text-green-600"
            aria-label="Ready to launch"
          />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={model.score} />
          <p className="text-muted-foreground text-xs">{model.benchmark}</p>
        </div>
        {model.topActions.length > 0 && (
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-sm">
            {model.topActions.slice(0, 3).map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const degrees = score * 3.6;
  return (
    <div
      className="relative h-20 w-20 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${degrees}deg, var(--muted) ${degrees}deg)`,
      }}
      role="img"
      aria-label={`Readiness score ${score} out of 100`}
    >
      <div className="bg-background absolute inset-1 flex items-center justify-center rounded-full text-lg font-semibold">
        {score}
      </div>
    </div>
  );
}
