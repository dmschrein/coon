import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MONETIZATION_MODEL_CARDS } from "@/lib/constants/monetization-models";
import type { ModelReadiness, ReadinessOutput } from "@/types";

interface HubScorecardSectionProps {
  readiness: ReadinessOutput;
}

export function HubScorecardSection({ readiness }: HubScorecardSectionProps) {
  if (readiness.models.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Launch readiness</h2>
        <p className="text-muted-foreground text-sm">{readiness.summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {readiness.models.map((model) => (
          <ScoreCard key={model.name} model={model} />
        ))}
      </div>
    </section>
  );
}

function ScoreCard({ model }: { model: ModelReadiness }) {
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
