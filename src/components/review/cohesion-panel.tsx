"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CohesionCheckResult } from "@/lib/agents/cohesion-checker";

interface CohesionPanelProps {
  open: boolean;
  onClose: () => void;
  result: CohesionCheckResult | null;
  isLoading: boolean;
}

const severityColors = {
  low: "bg-yellow-100 text-yellow-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
};

export function CohesionPanel({
  open,
  onClose,
  result,
  isLoading,
}: CohesionPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[400px] overflow-y-auto sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Cohesion Check</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 space-y-3">
            <p className="text-muted-foreground text-sm">
              Analyzing campaign cohesion...
            </p>
            <Progress value={33} className="animate-pulse" />
          </div>
        )}

        {result && !isLoading && (
          <div className="mt-6 space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">Cohesion Score</p>
              <div className="flex items-center gap-3">
                <Progress value={result.score} />
                <span className="text-2xl font-bold">{result.score}</span>
              </div>
            </div>

            {result.flaggedIssues.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  Flagged Issues ({result.flaggedIssues.length})
                </p>
                <div className="space-y-2">
                  {result.flaggedIssues.map((issue, i) => (
                    <div
                      key={i}
                      className="space-y-1 rounded-md border p-3 text-sm"
                    >
                      <Badge className={severityColors[issue.severity]}>
                        {issue.severity}
                      </Badge>
                      <p>{issue.issue}</p>
                      <p className="text-muted-foreground text-xs">
                        Content: {issue.contentId}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Suggestions</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
