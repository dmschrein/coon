"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ScrollText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ManifestoEditor } from "@/components/community/manifesto-editor";
import { OnboardingBuilder } from "@/components/community/onboarding-builder";
import {
  SetupGuideModal,
  SETUP_GUIDE_PLATFORMS,
} from "@/components/community/setup-guide-modal";
import { useManifesto, useGenerateManifesto } from "@/hooks/use-manifesto";
import { useSetupGuides } from "@/hooks/use-setup-guide";
import type { ManifestoSection, SetupGuidePlatform } from "@/types";

export default function CommunityPage() {
  const { data: manifesto, isLoading } = useManifesto();
  const generate = useGenerateManifesto();
  const [regeneratingSection, setRegeneratingSection] =
    useState<ManifestoSection | null>(null);

  const { data: setupGuides } = useSetupGuides();
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupPlatform, setSetupPlatform] =
    useState<SetupGuidePlatform>("discord");

  const openSetupGuide = (platform: SetupGuidePlatform) => {
    setSetupPlatform(platform);
    setSetupOpen(true);
  };

  const handleGenerate = () => {
    generate.mutate(
      {},
      {
        onSuccess: () => toast.success("Manifesto generated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRegenerateSection = (section: ManifestoSection) => {
    setRegeneratingSection(section);
    generate.mutate(
      { regenerate: true, section },
      {
        onSuccess: () => toast.success(`Regenerated ${section}`),
        onError: (err) => toast.error(err.message),
        onSettled: () => setRegeneratingSection(null),
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Manifesto</h1>
          <p className="text-muted-foreground text-sm">
            Define what your community stands for before you launch.
          </p>
        </div>
        {manifesto ? (
          <Button onClick={handleGenerate} disabled={generate.isPending}>
            {generate.isPending && !regeneratingSection ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Regenerate All
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-12">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading manifesto…
        </div>
      ) : manifesto ? (
        <ManifestoEditor
          manifesto={manifesto}
          onRegenerateSection={handleRegenerateSection}
          regeneratingSection={regeneratingSection}
        />
      ) : (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <ScrollText className="text-muted-foreground h-12 w-12" />
          <h3 className="mt-4 text-lg font-semibold">No manifesto yet</h3>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Generate a manifesto to articulate your community&apos;s mission,
            values, and invitation.
          </p>
          <Button
            className="mt-6"
            onClick={handleGenerate}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Manifesto
          </Button>
        </div>
      )}

      <section className="space-y-3 border-t pt-6">
        <div>
          <h2 className="text-xl font-semibold">Platform Setup</h2>
          <p className="text-muted-foreground text-sm">
            Step-by-step checklists to launch your community on each platform.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SETUP_GUIDE_PLATFORMS.map((p) => (
            <div
              key={p.value}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{p.label}</span>
                {setupGuides?.[p.value]?.completed ? (
                  <Badge className="border-transparent bg-green-600 text-white">
                    Completed
                  </Badge>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openSetupGuide(p.value)}
              >
                Open Setup Guide
              </Button>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t pt-6">
        <OnboardingBuilder />
      </div>

      <SetupGuideModal
        open={setupOpen}
        onOpenChange={setSetupOpen}
        initialPlatform={setupPlatform}
      />
    </div>
  );
}
