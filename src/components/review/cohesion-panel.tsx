"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  RefreshCw,
  Wand2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { CohesionCheckResult, CohesionFlag } from "@/types";

interface CohesionPanelProps {
  open: boolean;
  onClose: () => void;
  result: CohesionCheckResult | null;
  isLoading: boolean;
  onRecheck: () => void;
  onContentClick: (contentId: string) => void;
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreStroke(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 60) return "stroke-yellow-500";
  return "stroke-red-500";
}

function getProgressColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function CircularScore({ score }: { score: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-700 ${getScoreStroke(score)}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
      <p className="text-muted-foreground text-sm font-medium">
        Campaign Cohesion Score
      </p>
    </div>
  );
}

function DimensionSection({
  name,
  score,
  flags,
  onContentClick,
}: {
  name: string;
  score: number;
  flags: CohesionFlag[];
  onContentClick: (contentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(flags.length > 0);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="text-sm font-medium">{name}</span>
        <span className={`ml-auto text-sm font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
      </button>

      <div className="ml-6">
        <div className="bg-muted h-1.5 rounded-full">
          <div
            className={`h-1.5 rounded-full transition-all ${getProgressColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {expanded && flags.length > 0 && (
        <div className="ml-6 space-y-2 pt-1">
          {flags.map((flag, i) => (
            <div key={i} className="rounded-md border p-2.5 text-xs">
              <p className="text-foreground">{flag.issue}</p>
              <p className="text-muted-foreground mt-1">
                <span className="font-medium">Fix:</span> {flag.fix}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {flag.content_ids.map((id) => (
                  <button
                    key={id}
                    onClick={() => onContentClick(id)}
                    className="text-primary hover:text-primary/80 bg-primary/10 rounded px-1.5 py-0.5 text-[10px] font-medium hover:underline"
                  >
                    {id.slice(0, 8)}...
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && flags.length === 0 && (
        <p className="text-muted-foreground ml-6 text-xs">No issues found</p>
      )}
    </div>
  );
}

export function CohesionPanel({
  open,
  onClose,
  result,
  isLoading,
  onRecheck,
  onContentClick,
}: CohesionPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[400px] overflow-y-auto sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Cohesion Check</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Analyzing campaign cohesion...
            </p>
          </div>
        )}

        {result && !isLoading && (
          <div className="mt-6 space-y-6">
            {/* Overall Score */}
            <CircularScore score={result.overall_score} />

            {/* Dimension Breakdown */}
            <div className="space-y-4">
              <DimensionSection
                name="Messaging Consistency"
                score={result.messaging.score}
                flags={result.messaging.flags}
                onContentClick={onContentClick}
              />
              <DimensionSection
                name="Tone Consistency"
                score={result.tone.score}
                flags={result.tone.flags}
                onContentClick={onContentClick}
              />
              <DimensionSection
                name="Factual Consistency"
                score={result.factual.score}
                flags={result.factual.flags}
                onContentClick={onContentClick}
              />
              <DimensionSection
                name="Strategic Alignment"
                score={result.strategic.score}
                flags={result.strategic.flags}
                onContentClick={onContentClick}
              />
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Recommendations</p>
                <div className="space-y-2">
                  {[...result.recommendations]
                    .sort((a, b) => {
                      const order = { high: 0, medium: 1, low: 2 };
                      return order[a.priority] - order[b.priority];
                    })
                    .map((rec, i) => (
                      <div key={i} className="rounded-md border p-2.5 text-xs">
                        <div className="mb-1 flex items-start gap-2">
                          <Badge
                            className={`shrink-0 text-[10px] ${priorityColors[rec.priority]}`}
                          >
                            {rec.priority}
                          </Badge>
                          <p>{rec.text}</p>
                        </div>
                        {rec.content_ids.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {rec.content_ids.map((id) => (
                              <button
                                key={id}
                                onClick={() => onContentClick(id)}
                                className="text-primary hover:text-primary/80 bg-primary/10 rounded px-1.5 py-0.5 text-[10px] font-medium hover:underline"
                              >
                                {id.slice(0, 8)}...
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onRecheck}
                className="flex-1"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Re-check
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex-1"
                title="Coming soon"
              >
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Auto-fix
              </Button>
            </div>
          </div>
        )}

        {!result && !isLoading && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm">
              No cohesion analysis yet.
            </p>
            <Button variant="outline" size="sm" onClick={onRecheck}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Run Check
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
