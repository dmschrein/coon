"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Loader2, AlertCircle } from "lucide-react";

interface GenerationProgressProps {
  status: string;
  strategyComplete: boolean;
  totalPieces: number;
  completedPieces: number;
  failedPieces: number;
  platforms: string[];
  currentPlatform: string | null;
  progress: number;
  onRetry?: () => void;
}

const PHASE_LABELS = [
  { key: "strategy", label: "Building campaign strategy..." },
  { key: "content", label: "Generating content pieces..." },
  { key: "finalize", label: "Finalizing your campaign..." },
];

function getPhase(props: GenerationProgressProps) {
  if (!props.strategyComplete) return "strategy";
  if (props.completedPieces < props.totalPieces) return "content";
  return "finalize";
}

export function GenerationProgress(props: GenerationProgressProps) {
  const {
    status,
    strategyComplete,
    totalPieces,
    completedPieces,
    failedPieces,
    platforms,
    currentPlatform,
    progress,
    onRetry,
  } = props;

  const isFailed = status === "failed";
  const currentPhase = getPhase(props);

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-8 p-8">
          {/* Animated icon */}
          <div className="flex justify-center">
            {isFailed ? (
              <AlertCircle className="text-destructive h-16 w-16" />
            ) : (
              <Sparkles className="text-primary h-16 w-16 animate-pulse" />
            )}
          </div>

          {/* Heading */}
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              {isFailed ? "Generation Failed" : "Generating your campaign..."}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {isFailed
                ? "Something went wrong. You can retry the generation."
                : "This may take a minute. Your content is being crafted by AI."}
            </p>
          </div>

          {/* Progress bar */}
          {!isFailed && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="bg-secondary h-3 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Phase checklist */}
          <div className="space-y-3">
            {PHASE_LABELS.map(({ key, label }) => {
              const isDone =
                (key === "strategy" && strategyComplete) ||
                (key === "content" &&
                  totalPieces > 0 &&
                  completedPieces >= totalPieces) ||
                (key === "finalize" && status === "complete");
              const isActive = !isFailed && currentPhase === key;

              return (
                <div key={key} className="flex items-center gap-3">
                  {isDone ? (
                    <Check className="h-5 w-5 shrink-0 text-green-500" />
                  ) : isActive ? (
                    <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
                  ) : (
                    <div className="bg-muted h-5 w-5 shrink-0 rounded-full" />
                  )}
                  <span
                    className={
                      isDone
                        ? "text-muted-foreground line-through"
                        : isActive
                          ? "font-medium"
                          : "text-muted-foreground"
                    }
                  >
                    {key === "content" && totalPieces > 0
                      ? `Generating content... (${completedPieces} of ${totalPieces} pieces)`
                      : label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Current platform indicator */}
          {currentPlatform && !isFailed && (
            <div className="text-center">
              <p className="text-muted-foreground text-xs">
                Currently generating for
              </p>
              <Badge variant="outline" className="mt-1 capitalize">
                {currentPlatform}
              </Badge>
            </div>
          )}

          {/* Platform badges */}
          {platforms.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {platforms.map((platform) => (
                <Badge
                  key={platform}
                  variant={
                    currentPlatform === platform ? "default" : "secondary"
                  }
                  className="capitalize"
                >
                  {platform}
                </Badge>
              ))}
            </div>
          )}

          {/* Failure stats */}
          {failedPieces > 0 && (
            <p className="text-destructive text-center text-sm">
              {failedPieces} piece{failedPieces > 1 ? "s" : ""} failed to
              generate
            </p>
          )}

          {/* Retry button */}
          {isFailed && onRetry && (
            <div className="flex justify-center">
              <Button onClick={onRetry}>
                <Sparkles className="mr-2 h-4 w-4" />
                Retry Generation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
