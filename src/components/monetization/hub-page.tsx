import Link from "next/link";
import { ArrowRight, DollarSign, Handshake, Crown, Gauge } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MONETIZATION_MODEL_CARDS } from "@/lib/constants/monetization-models";
import { HubStatGrid } from "./hub-stat-grid";
import { HubScorecardSection } from "./hub-scorecard-section";
import type {
  MonetizationConfig,
  ModelReadiness,
  ReadinessOutput,
} from "@/types";

interface HubPageProps {
  data: {
    config: MonetizationConfig | null;
    readiness: ReadinessOutput | null;
    revenueThisMonth: number;
    pipelineValue: number;
    activeTierCount: number;
  };
}

const SUB_PAGES = [
  {
    href: "/dashboard/monetization/sponsorships",
    title: "Sponsorships",
    description: "Track deals from prospect to active.",
    icon: Handshake,
  },
  {
    href: "/dashboard/monetization/membership",
    title: "Membership",
    description: "Configure paid tiers and benefits.",
    icon: Crown,
  },
  {
    href: "/dashboard/monetization/revenue",
    title: "Revenue",
    description: "Log entries and watch MRR trends.",
    icon: DollarSign,
  },
  {
    href: "/dashboard/monetization/setup",
    title: "Setup",
    description: "Edit your selected monetization models.",
    icon: Gauge,
  },
] as const;

export function HubPage({ data }: HubPageProps) {
  const { config, readiness } = data;

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Monetization</h1>
        <p className="text-muted-foreground mt-1">
          Track readiness, revenue, and the next move for each model.
        </p>
      </header>

      {!config ? <SetupCta /> : <HubStatGrid data={data} />}

      {readiness && (
        <>
          <HubScorecardSection readiness={readiness} />
          <NextBestActionCard readiness={readiness} />
        </>
      )}

      <SubPageLinks />
    </div>
  );
}

function SetupCta() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up your monetization model</CardTitle>
        <CardDescription>
          Pick the models you&apos;ll use to monetize so we can score your
          launch readiness and surface the next best move.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/dashboard/monetization/setup">
            Set up your monetization model
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function NextBestActionCard({ readiness }: { readiness: ReadinessOutput }) {
  const lowest = pickLowestScoringModel(readiness.models);
  if (!lowest || lowest.topActions.length === 0) return null;

  const card = MONETIZATION_MODEL_CARDS.find((c) => c.id === lowest.name);
  const displayName = card?.name ?? lowest.name;

  return (
    <Card data-testid="next-best-action-card">
      <CardHeader>
        <CardTitle>Next best action</CardTitle>
        <CardDescription>
          From your lowest-scoring model: {displayName} ({lowest.score}/100)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-medium">{lowest.topActions[0]}</p>
      </CardContent>
    </Card>
  );
}

function pickLowestScoringModel(
  models: ModelReadiness[]
): ModelReadiness | null {
  if (models.length === 0) return null;
  return models.reduce((min, m) => (m.score < min.score ? m : min), models[0]);
}

function SubPageLinks() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {SUB_PAGES.map((page) => (
        <Link key={page.href} href={page.href} className="group">
          <Card className="group-hover:border-primary h-full transition-colors">
            <CardHeader className="flex flex-row items-center gap-2">
              <page.icon className="text-muted-foreground h-5 w-5" />
              <CardTitle className="text-base">{page.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {page.description}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
