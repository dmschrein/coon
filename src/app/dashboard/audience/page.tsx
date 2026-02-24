"use client";

import { useAudienceProfile, useRegenerateProfile } from "@/hooks/use-audience-profile";
import { Button } from "@/components/ui/button";
import { AudienceProfileCard } from "@/components/audience/audience-profile-card";
import { PersonaCard } from "@/components/audience/persona-card";
import { KeywordsDisplay } from "@/components/audience/keywords-display";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function AudiencePage() {
  const { data: profile, isLoading, error } = useAudienceProfile();
  const regenerate = useRegenerateProfile();

  const handleRegenerate = async () => {
    try {
      await regenerate.mutateAsync();
      toast.success("Audience profile regenerated successfully");
    } catch (err) {
      toast.error("Failed to regenerate profile. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading audience profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">Failed to load audience profile</p>
          <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
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

        <div className="flex min-h-[400px] items-center justify-center">
          <div className="max-w-md text-center">
            <Sparkles className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">No Audience Profile Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate your first audience profile based on your quiz responses. Our AI will
              analyze your product and market to create detailed personas and messaging insights.
            </p>
            <Button
              onClick={handleRegenerate}
              disabled={regenerate.isPending}
              className="mt-6"
              size="lg"
            >
              {regenerate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Profile...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Audience Profile
                </>
              )}
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
      <KeywordsDisplay keywords={[...profile.profileData.keywords, ...profile.profileData.hashtags]} />
    </div>
  );
}
