"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAudienceProfile,
  useRegenerateProfile,
} from "@/hooks/use-audience-profile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudienceProfileCard } from "@/components/audience/audience-profile-card";
import { PersonaCard } from "@/components/audience/persona-card";
import { KeywordsDisplay } from "@/components/audience/keywords-display";
import { ConfidenceBadge } from "@/components/audience/confidence-badge";
import { StrategyCard } from "@/components/audience/strategy-card";
import { InsightsTab } from "@/components/audience/insights-tab";
import { CtaBanner } from "@/components/audience/cta-banner";
import { ProfileRefinementModal } from "@/components/audience/profile-refinement-modal";
import { GenerationProgress } from "@/components/audience/generation-progress";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function AudiencePage() {
  const searchParams = useSearchParams();
  const { data: profile, isLoading, error } = useAudienceProfile();
  const regenerate = useRegenerateProfile();
  const [refineOpen, setRefineOpen] = useState(false);
  const autoGenerateFired = useRef(false);

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

  const hasInsights = profile.analyticsData !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audience Analysis</h1>
        <p className="text-muted-foreground">
          Your AI-generated target audience profile
        </p>
      </div>

      {profile.profileData.brandVoice && profile.profileData.contentPillars ? (
        <>
          <StrategyCard
            profile={profile.profileData}
            confidenceLevel={profile.confidenceLevel}
            onRegenerate={handleRegenerate}
            isRegenerating={regenerate.isPending}
          />
          {hasInsights && (
            <div className="flex justify-end">
              <Button
                onClick={() => setRefineOpen(true)}
                variant="outline"
                size="sm"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Refine from performance data
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between">
          <ConfidenceBadge level={profile.confidenceLevel} />
          <div className="flex items-center gap-2">
            {hasInsights && (
              <Button
                onClick={() => setRefineOpen(true)}
                variant="outline"
                size="sm"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Refine from performance data
              </Button>
            )}
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
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          {hasInsights && <TabsTrigger value="insights">Insights</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AudienceProfileCard profile={profile.profileData} />
        </TabsContent>

        <TabsContent value="personas" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {profile.profileData.primaryPersonas.map((persona, idx) => (
              <PersonaCard key={idx} persona={persona} index={idx} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <KeywordsDisplay
            keywords={[
              ...profile.profileData.keywords,
              ...profile.profileData.hashtags,
            ]}
          />
        </TabsContent>

        {hasInsights && (
          <TabsContent value="insights" className="space-y-6">
            <InsightsTab />
          </TabsContent>
        )}
      </Tabs>

      <CtaBanner />

      <ProfileRefinementModal open={refineOpen} onOpenChange={setRefineOpen} />
    </div>
  );
}
