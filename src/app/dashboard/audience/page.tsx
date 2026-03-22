"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useAudienceProfile,
  useRegenerateProfile,
} from "@/hooks/use-audience-profile";
import { Button } from "@/components/ui/button";
import { AudienceProfileCard } from "@/components/audience/audience-profile-card";
import { PersonaCard } from "@/components/audience/persona-card";
import { KeywordsDisplay } from "@/components/audience/keywords-display";
import { Loader2, RefreshCw, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const AUDIENCE_GENERATION_STEPS = [
  "Analyzing your product...",
  "Researching your market...",
  "Building audience personas...",
  "Crafting messaging insights...",
  "Almost done...",
];

function GenerationProgress({ isGenerating }: { isGenerating: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isGenerating) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    stepIntervalRef.current = setInterval(() => {
      setStepIndex((i) =>
        i < AUDIENCE_GENERATION_STEPS.length - 1 ? i + 1 : i
      );
    }, 12000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, [isGenerating]);

  if (!isGenerating) return null;

  const progressPct = Math.min(
    (stepIndex / (AUDIENCE_GENERATION_STEPS.length - 1)) * 90,
    90
  );

  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="w-full max-w-md space-y-6 text-center">
        <Sparkles className="text-primary mx-auto h-12 w-12 animate-pulse" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            Building Your Audience Profile
          </h2>
          <p className="text-muted-foreground text-sm">
            {AUDIENCE_GENERATION_STEPS[stepIndex]}
          </p>
        </div>
        <div className="space-y-2">
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-3000 ease-in-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">{elapsed}s elapsed</p>
        </div>
      </div>
    </div>
  );
}

export default function AudiencePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: profile, isLoading, error } = useAudienceProfile();
  const regenerate = useRegenerateProfile();
  const autoGenerateFired = useRef(false);

  // Auto-trigger generation when arriving from quiz
  useEffect(() => {
    if (
      searchParams.get("autoGenerate") === "true" &&
      !isLoading &&
      !profile &&
      !autoGenerateFired.current &&
      !regenerate.isPending
    ) {
      autoGenerateFired.current = true;
      regenerate.mutate(undefined, {
        onError: () =>
          toast.error("Failed to generate profile. Please try again."),
      });
    }
  }, [searchParams, isLoading, profile, regenerate]);

  const handleRegenerate = async () => {
    try {
      await regenerate.mutateAsync();
      toast.success("Audience profile regenerated successfully");
    } catch {
      toast.error("Failed to regenerate profile. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4 text-sm">
            Loading audience profile...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-sm">
            Failed to load audience profile
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Generating state (auto-triggered or manual)
  if (regenerate.isPending) {
    return <GenerationProgress isGenerating />;
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audience Analysis</h1>
          <p className="text-muted-foreground">
            Generate your target audience profile with AI
          </p>
        </div>

        <div className="flex min-h-100 items-center justify-center">
          <div className="max-w-md text-center">
            <Sparkles className="text-primary mx-auto h-12 w-12" />
            <h2 className="mt-4 text-xl font-semibold">
              Ready to Meet Your Audience?
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Our AI will analyze your product and market to build detailed
              personas and messaging insights.
            </p>
            <Button
              onClick={handleRegenerate}
              disabled={regenerate.isPending}
              className="mt-6"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Audience Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audience Analysis</h1>
          <p className="text-muted-foreground">
            Your AI-generated target audience profile
          </p>
        </div>
        <Button
          onClick={handleRegenerate}
          disabled={regenerate.isPending}
          variant="outline"
          size="sm"
        >
          {regenerate.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      {/* Profile Overview */}
      <AudienceProfileCard profile={profile.profileData} />

      {/* Personas */}
      <div>
        <h2 className="mb-4 text-2xl font-bold">Audience Personas</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {profile.profileData.primaryPersonas.map((persona, idx) => (
            <PersonaCard key={idx} persona={persona} index={idx} />
          ))}
        </div>
      </div>

      {/* Keywords & Hashtags */}
      <KeywordsDisplay
        keywords={[
          ...profile.profileData.keywords,
          ...profile.profileData.hashtags,
        ]}
      />

      {/* Next step CTA */}
      <div className="bg-muted/40 flex items-center justify-between gap-4 rounded-lg border p-6">
        <div>
          <p className="font-semibold">Your audience is ready.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate content tailored to these personas — ready to post across
            your platforms.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/content?autoGenerate=true")}
        >
          Generate Content
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
