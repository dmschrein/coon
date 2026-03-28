"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge } from "@/components/audience/confidence-badge";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, RefreshCw, User } from "lucide-react";
import type { AudienceProfile, ConfidenceLevel } from "@/types";

interface StrategyCardProps {
  profile: AudienceProfile;
  confidenceLevel: ConfidenceLevel;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const PILLAR_COLORS = [
  "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
];

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold tracking-wide uppercase">{title}</h3>
      <button
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Edit ${title}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function StrategyCard({
  profile,
  confidenceLevel,
  onRegenerate,
  isRegenerating,
}: StrategyCardProps) {
  const persona = profile.primaryPersonas[0];
  const { demographics, brandVoice, contentPillars } = profile;

  const demographicTags = [
    `${demographics.ageRange[0]}-${demographics.ageRange[1]}`,
    demographics.locations[0],
    demographics.jobTitles[0],
    demographics.incomeRange,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6",
        "bg-gradient-to-br from-purple-50/80 via-blue-50/60 to-indigo-50/40",
        "dark:from-purple-950/30 dark:via-blue-950/20 dark:to-indigo-950/10",
        "shadow-lg shadow-purple-500/5 backdrop-blur-sm"
      )}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Your Strategy</h2>
        <div className="flex items-center gap-3">
          <ConfidenceBadge level={confidenceLevel} />
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Column 1: Target Audience */}
        <div>
          <SectionHeader title="Target Audience" />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-blue-400">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{persona?.name}</p>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                {persona?.description}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {demographicTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Column 2: Brand Voice */}
        <div>
          <SectionHeader title="Brand Voice" />
          {brandVoice ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {brandVoice.descriptors.map((descriptor) => (
                  <span
                    key={descriptor}
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      "bg-purple-100/80 text-purple-700",
                      "dark:bg-purple-900/40 dark:text-purple-300"
                    )}
                  >
                    {descriptor}
                  </span>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                {brandVoice.summary}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Regenerate your profile to get brand voice recommendations.
            </p>
          )}
        </div>

        {/* Column 3: Content Pillars */}
        <div>
          <SectionHeader title="Content Pillars" />
          {contentPillars ? (
            <div className="space-y-2">
              {contentPillars.map((pillar, idx) => (
                <div key={pillar.name} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      PILLAR_COLORS[idx % PILLAR_COLORS.length]
                    )}
                  >
                    {pillar.name}
                  </span>
                  <span className="text-muted-foreground text-xs font-medium">
                    {pillar.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Regenerate your profile to get content pillar recommendations.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
