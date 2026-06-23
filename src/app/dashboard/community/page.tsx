"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ScrollText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManifestoEditor } from "@/components/community/manifesto-editor";
import { useManifesto, useGenerateManifesto } from "@/hooks/use-manifesto";
import type { ManifestoSection } from "@/types";

export default function CommunityPage() {
  const { data: manifesto, isLoading } = useManifesto();
  const generate = useGenerateManifesto();
  const [regeneratingSection, setRegeneratingSection] =
    useState<ManifestoSection | null>(null);

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
    </div>
  );
}
